﻿'use strict';
const Docker = require('node-docker-api').Docker
const fs = require('fs');
const compiler = require('./models/Compiler')
const execenv = require('./models/ExecEnv')
const tar = require('tar')
const path = require('path')
const { promisify } = require('util')
const unlinkAsync = promisify(fs.unlink)
const renameAsync = promisify(fs.rename)
const crypto = require('crypto')


const dockerProto = process.env.RACOONDOCKERPROTO || 'http'
const dockerHost = process.env.RACOONDOCKERHOST || '127.0.0.1'
const dockerPort = process.env.RACOONDOCKERPORT || 2376

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

async function pingDocker()
{
	try{
		const info = await docker.info();
		return[true, info];
	}catch(err)
	{
		console.error(err);
		return [false, err];
	}
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
		.then(() => console.log('Test container deleted'))
		.catch((error) => console.log(error))

}
/** Compiles inside a container
 * 
 * @param {string} comp Compiler name.
 * @param {string} file Complete path to the input file. Can be referenced by ${this.file}
 * @param {string} _outfile Output file path. Optional. If not specified outputs with the same name, but with .tar extension.
 * @returns {string} Path to binary. On fail throws pair int, string. If int is greater than zero, problem is bad compiler configuration or server error. If it's 0, problem is with the executed program (normal CE)
 */
async function compile(comp, file, _outfile) {
	return new Promise(async (resolve, reject) => {
		var logs = ''
		let container
		try {

			const fileBasename = path.basename(file)
			const fileDirname = path.dirname(file)
			const outfile = _outfile || file.replace(fileExtension, '.tar')
			const tarfile = `${fileDirname}/${crypto.randomBytes(10).toString('hex')}.tar`;

			console.log(`Let's compile! ${fileBasename}`);

			if((await pingDocker())[0] == false){
				reject([1, 'Cannot reach docker machine']);
				return;
			}

			const compilerInstance = await compiler.findOne({ name: comp });

			if (!compilerInstance){
				reject ([1, 'Invalid compiler name']);
				return;
			}

			if (compilerInstance.shadow === true) {
				resolve(file);
				return;
			}

			await tar.c({
				file: tarfile,
				cwd: fileDirname
			}, [fileBasename])

			container = await docker.container.create({
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
			let _unpromStream = await container.logs({
				follow: true,
				stdout: true,
				stderr: true
			})

			await new Promise((resolve, reject) => {
				_unpromStream.on('data', (d) => {
							logs = logs.concat(d.toString().substr(8, d.toString().length));
					})
				_unpromStream.on('end', resolve)
				_unpromStream.on('error', reject)
			});
			await container.wait();

			const outTarPath = outfile + '.tmptar'

			await container.fs.get({ path: compilerInstance.output_name })
				.then(stream => {
					const file = fs.createWriteStream(outTarPath)
					stream.pipe(file)
					return promisifyStreamNoSpam(stream)
				})
			
			let compiledFile;
            await tar.list({file : outTarPath, onentry: entry => {compiledFile = entry.path}});
			await tar.extract({ file: outTarPath, C: fileDirname });
			
			await renameAsync(`${fileDirname}/${compiledFile}`, outfile)
			await unlinkAsync(outTarPath)

			await container.delete({ force: true })

			resolve(outfile);
		} catch (err) {
			if (typeof container !== 'undefined') await container.delete({ force: true })
			if (logs.length) reject([0, logs])
			else reject([1, err ])
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
async function exec(exname, infile, stdinfile) {
	return new Promise(async (resolve, reject) => {
		const _execInstance = await execenv.findOne({ name: exname });
		if (!_execInstance) {
			reject([1, 'Invalid ExecEnv']);
			return;
		}

		let _container

		try {
			
			const fileBasename = path.basename(infile);
			const fileDirname = path.dirname(infile);
			const tarfile = `${fileDirname}/${crypto.randomBytes(10).toString('hex')}.tar`;

			const infilename = fileBasename;//infile.replace(pathToFile, '')

			let stdininfilename = '';
			if(stdinfile)stdininfilename = path.basename(stdinfile);

			console.log(`Let's execute! ${fileBasename}`);

			if((await pingDocker())[0] == false){
				reject([1, 'Cannot reach docker machine']);
				return;
			}

			_container = await docker.container.create({
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
				reject([0, 'Time Limit Exceeded']);
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
				_container.delete({ force: true }).catch((e) => console.error(`Failed to clean up after exec error, it is still alive! ${e}`));
			}
			reject([1, `Failed at execution attempt: ${err}`]);
			return;
		}

	})
}

/** Executes a program inside docker container, but better
 * 
 * @param {string} exname Name of Execution Environment
 * @param {string} infile Path to input file, expects a file. Can be referenced by ${this.file}
 * @param {string} stdinfile Path to the file to be sent to the container, containing input data. You need to pipe its contents 'manually' e.g. by executing command inside container. Can be referenced by ${this.input}
 * @param {Object} morefiles More files. Format {patternNameToBeReplaced: filePath}.
 * @param {Object} opts Options. memLimit - memory limit. timeLimit - time limit. env - array of environmental variables to pass.
 * @returns {string} Tuple with paths to files containing demultiplexed output. 0 is stdout, 1 is stderr. On fail throws pair int, string. If int is greater than zero, problem is bad execenv configuration or server error. If it's 0, problem is with the executed program (it page-faults or exceeds time limits)
 */
async function execEx(exname, infile, stdinfile, morefiles, optz) {
	return new Promise(async (resolve, reject) => {
		const _execInstance = await execenv.findOne({ name: exname });
		const opts = optz || {};

		if (!_execInstance) {
			reject([1, 'Invalid ExecEnv']);
			return;
		}

		let _container

		try {
			
			const fileBasename = path.basename(infile);
			const fileDirname = path.dirname(infile);
			const tarfile = `${fileDirname}/${crypto.randomBytes(10).toString('hex')}.tar`;

			const infilename = fileBasename;

			let stdininfilename = '';
			if(stdinfile)stdininfilename = path.basename(stdinfile);

			const timeLimit = Math.min(_execInstance.time, isNaN(opts.timeLimit) ? Infinity : opts.timeLimit);
			const memLimit = Math.min(_execInstance.memLimit, isNaN(opts.memLimit) ? Infinity: opts.memLimit);

			const patternObject = { file: infilename, input: stdininfilename }
			for (let key in morefiles) {
				patternObject[key] = path.basename(morefiles[key])
			}

			console.log(`Let's execute! ${fileBasename}`);

			_container = await docker.container.create({
				Image: _execInstance.image_name,
				// _execInstance.exec_command can be template string, it splits with '_'
				// Example of exec_command:
				// "bash -c chmod_+x_a.out_;_./a.out" 
				// (results in ['bash', '-c', 'chmod +x a.out ; ./a.out'])
				// or
				// "bash -c chmod_+x_${this.file}_;_./${this.file}"
				Cmd: ((template, vars) => {
					return new Function('return `' + template + '`;').call(vars)
				})(_execInstance.exec_command, patternObject).split(' ').map(el => el.replace(/_/g, ' ')),
				Memory: memLimit,
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
				await tar.r({ 
					file: tarfile,
					cwd: fileDirname
				}, [stdininfilename])
			}
			if(morefiles){
				for( let key in morefiles){
					await tar.r({ 
						file: tarfile,
						cwd: path.dirname(morefiles[key])
					}, [path.basename(morefiles[key])])
				}
			}

			let _unpromStream = await _container.fs.put(tarfile, { path: '.' })
			await promisifyStreamNoSpam(_unpromStream);
			
			await unlinkAsync(tarfile);

			await _container.start();
			await asyncWait(timeLimit);
			await _container.kill()
			.catch(_=>{});

			const inspection = await _container.status();
			const execTime = new Date(inspection.data.State.FinishedAt) - new Date(inspection.data.State.StartedAt);

			console.log(`Calculated uptime of ${execTime}`);

			if (execTime >= timeLimit) {

				await _container.delete({ force: true });
				reject([0,'Time Limit Exceeded']);
				return;
			}

			console.log(`Container in state: ${inspection.data.State.Status} and health: ${inspection.data.State.Error}`);

			if (inspection.data.State.Error !== '') {

				await _container.delete({ force: true });
				reject([0,'Runtime Error', inspection.data.State.Error]);
				return;
			}

			if (inspection.data.State.ExitCode !== 0) {

				await _container.delete({ force: true });
				reject([0,'Runtime Error', inspection.data.State.ExitCode]);
				return;
			}

			_unpromStream = await _container.logs({
				follow: true,
				stdout: true,
				stderr: true
			})

			var logs = [... new Array(3)].map(()=>{
				return  `${fileDirname}/${crypto.randomBytes(10).toString('hex')}`;
			})

			var streams = [... new Array(3)].map((_, num)=>{
				return fs.createWriteStream(logs[num], {flags: 'a'});
			})

			await new Promise((resolve, reject) => {
				_unpromStream.on('data', (d) => {
					switch(d.toString().charCodeAt(0)){
						case 1: //stdout
							streams[0].write(d.toString().substr(8, d.toString().length)); //https://docs.docker.com/engine/api/v1.40/#operation/ContainerAttach;
							break;
						case 2: //stderr
							streams[1].write(d.toString().substr(8, d.toString().length));
							break;
						default: //stdin (sam)
							streams[2].write(d.toString().substr(8, d.toString().length));
							break;
					}
				})
				_unpromStream.on('end', resolve)
				_unpromStream.on('error', reject)
			})

			streams.forEach((s)=>{
				s.end();
			})

			await _container.delete({ force: true });

			resolve(logs);
			return;

		} catch (err) {
			if (typeof _container !== 'undefined') {
				_container.delete({ force: true }).catch((e) => console.error(`Failed to clean up after exec error, it is still alive! ${e}`));
			}
			reject([1, `Failed at execution attempt: ${err}`]);
			return;
		}

	})
}


async function nukeContainers(quit) {
	const shouldQuit = quit !== false;

	const conts = await docker.container.list({ all: true });
	console.log(`NUKING DOCKER!, containers=${conts.length}`);
	const promises = conts.map(cont => {
		const cname = cont.data.Names[0]
		return cont.start()
			//.then(() => cont.kill())
			.then(() => cont.delete({ force: true }))
			.catch(err => console.error(`There is always a catch. Nuking docker failed. Try: docker kill $(docker ps -aq) && docker rm $(docker ps -aq) , on the docker machine instead. ${err}`))
			.then(() => console.log(`Nuking ${cname} done`));
	})

	Promise.all(promises).then(function () {
		if (shouldQuit) process.exit(0);
	})
}

module.exports = { gccDetect, compile, exec, execEx, nukeContainers, pingDocker }