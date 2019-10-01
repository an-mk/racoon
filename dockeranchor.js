"use strict";
const Docker = require('node-docker-api').Docker
const fs = require('fs');
const compiler = require('./compilers')
const execenv = require('./execenv')
const tar = require('tar')
const path = require('path')
const { promisify } = require('util')
const unlinkAsync = promisify(fs.unlink)
const crypto = require('crypto')


const dockerProto = process.env.RACOONDOCKERPROTO || 'http'
const dockerHost = process.env.RACOONDOCKERHOST || '127.0.0.1'
const dockerPort = process.env.RACOONDOCKERPORT || 2375

const docker = new Docker({ protocol: dockerProto, host: dockerHost, port: dockerPort })

function promisifyStream(stream) {
	return new Promise((resolve, reject) => {
		stream.on('data', (d) => console.log(d.toString()))
		stream.on('end', resolve)
		stream.on('error', reject)
	})
}

function promisifyStreamNoSpam(stream) {
	return new Promise((resolve, reject) => {
		stream.on('data', () => { }); //https://nodejs.org/api/stream.html#stream_event_data
		stream.on('end', resolve);
		stream.on('error', reject);
	})
}

const fileExtension = /\.[^/\\\.]*(?=$)/;
const pathToFile = /^.*[/\\]/;

function asyncWait(time) {
	return new Promise((resolve) => {
		setTimeout(resolve, time);
	})
}

const splitEx = /(["'].*?["']|[^"'\s]+)/g
function splitCommands(str) {
	return str.match(splitEx).map(
		(el) =>
			el.replace(/^["']|["']$/g, '')
	);
}

function gccDetect() {

	docker.container.create({
		Image: 'gcc',
		Cmd: ['/bin/bash'],
		name: 'test-gcc',
		AttachStdout: false,
		AttachStderr: false,
		tty: true
	})
		.then((container) => container.start())
		.then((container) => {
			_container = container
			return container.exec.create({
				AttachStdout: true,
				AttachStderr: true,
				Cmd: ['gcc', '--version']
			})
		})
		.then((exec) => {
			return exec.start({ detach: false })
		})
		.then((stream) => promisifyStream(stream))
		.then(() => _container.kill())
		.then(() => _container.delete({ force: true }))
		.then(() => console.log("Testowy kontener skasowany."))
		.catch((error) => console.log(error))

}
/** Compiles inside a container
 * 
 * @param {string} comp Compiler name. Can be referenced by ${this.file}
 * @param {string} file Complete path to the input file.
 * @param {string} _outfile Output file path. Optional. If not specified outputs with the same name, but with .tar extension.
 * @returns {string} Path to extracted tar archive. On fail throws pair int, string. If int is greater than zero, problem is bad compiler configuration or server error. If it's 0, problem is with the executed program (normal CE)
 */
async function compile(comp, file, _outfile) {
	return new Promise(async (resolve, reject) => {
		const logs = new Array()
		try {

			const fileBasename = path.basename(file)
			const filePureBasename = path.basename(file, path.extname(file))
			const fileDirname = path.dirname(file)
			const outfile = _outfile || file.replace(fileExtension, '.tar')
			const tarfile = `${fileDirname}/${crypto.randomBytes(10).toString('hex')}.tar`;

			console.log(`Let's compile! ${fileBasename}`);

			const compilerInstance = await compiler.Compiler.findOne({ name: comp });

			if (!compilerInstance){
				reject ([1,'Invalid compiler name']);
				return;
			}

			if (compilerInstance.shadow === true){
				resolve(file);
				return;
			}

			await tar.c({
				file: tarfile,
				cwd: fileDirname
			}, [fileBasename])

			var container = await docker.container.create({
				Image: compilerInstance.image_name,
				// compilerInstance.exec_command can be template string, it splits with ' '
				// '_' is a non-splitting space
				// Example of exec_command 
				// "gcc -lstdc++ -std=c++17 -O2 -o a.out ${this.file}"
				// or
				// "gcc -lstdc++ -std=c++17 -O2 -o ${this.file+'.out'} ${this.file}"
				// (but outputs are never exctracted from tar so they could have the same name)
				Cmd: ((template, vars) => {
					return new Function('return `' + template + '`;').call(vars)
				})(compilerInstance.exec_command, { file: fileBasename }).split(' ').map(el => el.replace(/_/g, ' ')),
				// file name could be required to be first argument or appear more than once in compiler commands of some weird languages :D
				AttachStdout: false,
				AttachStderr: false,
				tty: false
			})

			await container.fs.put(tarfile, { path: '.' })
				.then(stream => promisifyStream(stream))
			await unlinkAsync(tarfile)
			await container.start()
			await container.logs({
				follow: true,
				stdout: true,
				stderr: true
			}).then(stream => new Promise((resolve, reject) => {
				stream.on('data', (d) => logs.push(d.toString()))
				stream.on('end', resolve)
				stream.on('error', reject)
			}))
			await container.wait()

			await container.fs.get({ path: compilerInstance.output_name })
				.then(stream => {
					const file = fs.createWriteStream(outfile)
					stream.pipe(file)
					return promisifyStreamNoSpam(stream)
				})
			await container.delete({ force: true })
			resolve( outfile);
		} catch (err) {
			if (typeof container !== 'undefined') await container.delete({ force: true })
			if (logs.length) reject([0, logs.join()])
			else reject([0, err ])
		}
	})
}

/** Executes a program inside docker container
 * 
 * @param {string} exname Name of Execution Environment
 * @param {string} infile Path to input file, expects a file. Can be referenced by ${this.file}
 * @param {string} stdinfile Path to the file to be sent to the container, containing input data. You need to pipe its contents 'manually' e.g. by executing command inside container. Can be referenced by ${this.input}
 * @returns {string} Array containing output from running command. 0 is stdout, 1 is stderr. On fail throws pair int, string. If int is greater than zero, problem is bad execenv configuration or server error. If it's 0, problem is with the executed program (it page-faults or exceeds time limits)
 */
function exec(exname, infile, stdinfile) {
	return new Promise(async (resolve, reject) => {
		const _execInstance = await execenv.ExecEnv.findOne({ name: exname });

		if (!_execInstance) {
			reject([1,"Invalid ExecEnv"]);
			return;
		}

		try {
			
			const fileBasename = path.basename(infile);
			const filePureBasename = path.basename(infile, path.extname(infile));
			const fileDirname = path.dirname(infile);
			const tarfile = `${fileDirname}/${crypto.randomBytes(10).toString('hex')}.tar`;

			const infilename = fileBasename;//infile.replace(pathToFile, '')

			var stdininfilename = '';
			if(stdinfile)stdininfilename = path.basename(stdinfile);

			console.log(`Let's execute! ${fileBasename}`);

			var _container = await docker.container.create({
				Image: _execInstance.image_name,
				// _execInstance.exec_command can be template string, it splits with '_'
				// Example of exec_command:
				// "bash -c chmod_+x_a.out_;_./a.out" 
				// (results in ['bash', '-c', 'chmod +x a.out ; ./a.out'])
				// or
				// "bash -c chmod_+x_${this.file}_;_./${this.file}"
				Cmd: ((template, vars) => {
					return new Function('return `' + template + '`;').call(vars)
				})(_execInstance.exec_command, { file: infilename, input: stdininfilename }).split(' ').map(el => el.replace(/_/g, ' ')),
				Memory: _execInstance.memory,
				AttachStdout: false,
				AttachStderr: false,
				AttachStdin: false,
				tty: false,
				OpenStdin: false,
				//interactive: (stdinfile ? true : false),
			})
			await tar.c({ 
				file: tarfile,
				cwd: fileDirname
			}, [fileBasename])
			

			if (stdinfile) {
				/*console.log("Redirecting input.");
				var [_stdinstream,] = await _container.attach({ stream: true, stderr: true });
				var _fstrm = fs.createReadStream(stdinfile);
				_fstrm.pipe(_stdinstream) //readable->writable
				await promisifyStream(_fstrm);*/
				await tar.r({ 
					file: tarfile,
					cwd: fileDirname
				}, [stdininfilename])
			}

			var _unpromStream = await _container.fs.put(tarfile, { path: '.' })
			await promisifyStreamNoSpam(_unpromStream);
			
			await unlinkAsync(tarfile);

			await _container.start();

			//await _container.wait();

			await asyncWait(_execInstance.time);

			const inspection = await _container.status();

			if (inspection.data.State.Status !== 'exited') {
				await _container.kill();
				await _container.delete({ force: true });
				reject([0,"Time Limit Exceeded"]);
				return;
			}
			//else await _container.stop();

			_unpromStream = await _container.logs({
				follow: true,
				stdout: true,
				stderr: true
			})

			const logs = new Array('','','')

			await new Promise((resolve, reject) => {
				_unpromStream.on('data', (d) => {
					switch(d.toString().charCodeAt(0)){
						case 1: //stdout+(prawie zawsze)stdin
							logs[0] = logs[0].concat(d.toString().substr(8, d.toString().length)); //https://docs.docker.com/engine/api/v1.40/#operation/ContainerAttach;
							break;
						case 2: //stderr
							logs[1] = logs[1].concat(d.toString().substr(8, d.toString().length));
							break;
						default: //stdin (sam)
							logs[2] = logs[2].concat(d.toString().substr(8, d.toString().length));
							break;
					}
				})
				_unpromStream.on('end', resolve)
				_unpromStream.on('error', reject)
			})

			await _container.delete({ force: true });

			//resolve(logs.join().replace(/[^\x20-\x7E]/g, '').trim())
			resolve(logs);
			return;

		} catch (err) {
			if (typeof _container !== 'undefined') {
				_container.delete({ force: true }).catch((e) => console.log("Failed to clean up after exec error, it is still alive! " + e));
			}
			reject([1,"Failed at execution attempt: " + err]);
			return;
		}

	})
}


async function nukeContainers(quit) {
	const shouldQuit = quit !== false;

	var conts = await docker.container.list({ all: true });
	console.log("NUKING DOCKER!, containers=", conts.length);
	var promises = conts.map(cont => {
		const cname = cont.data.Names[0]
		return cont.start()
			//.then(() => cont.kill())
			.then(() => cont.delete({ force: true }))
			.catch((err) => console.log("There is always a catch. Nuking docker failed. Try: docker kill $(docker ps -aq) && docker rm $(docker ps -aq) , on the docker machine instead. " + err))
			.then(() => console.log(`Nuking ${cname} done`));
	})

	Promise.all(promises).then(function () {
		if (shouldQuit) process.exit(0);
	})
}

module.exports = { gccDetect, compile, exec, nukeContainers }