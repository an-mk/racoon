"use strict";
const Docker = require('node-docker-api').Docker
const fs = require('fs');
const compiler = require('./compilers')
const execenv = require('./execenv')
const tar = require('tar')
const path = require('path')
const { promisify } = require('util')
const unlinkAsync = promisify(fs.unlink)


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
/*
Parameters:
comp - compiler name (compilers.js)
file - path to input file, with filename.
[OPTIONAL] outfile - path where to put compiled file (with the new file name). Can be omitted to get the file in the working directory. The file is inside a TAR archive.
Return value:
Promise and path. If rejected it will be .docker.log file. If resolved it will be the compiled file.
 
Domyślnie wypluwa plik z rozszerzeniem .tar, bo jest to archiwum tar.
Od teraz daje inny plik o tej samej nazwie z rozszerzeniem .docker.log, który zawiera logi dockera, czyli w tym przebieg kompilacji, i błędy w jej trakcie.
*/
async function compile(comp, file, _outfile) {
	const logs = new Array()
	try {

		const fileBasename = path.basename(file)
		const filePureBasename = path.basename(file, path.extname(file))
		const fileDirname = path.dirname(file)
		const outfile = _outfile || file.replace(fileExtension, '.tar')

		console.log(`Let's compile! ${fileBasename}`);

		const compilerInstance = await compiler.Compiler.findOne({ name: comp });

		if (!compilerInstance)
			throw ('Invalid compiler name');

		if (compilerInstance.shadow === true)
			return file

		await tar.c({
			file: `${filePureBasename}.tar`,
			cwd: fileDirname
		}, [fileBasename])

		const container = await docker.container.create({
			Image: compilerInstance.image_name,
			// compilerInstance.exec_command can be template string, it splits with '_'
			// Example of exec_command 
			// "gcc_-lstdc++_-std=c++17_-O2_-o_a.out_${this.file}"
			// or
			// "gcc_-lstdc++_-std=c++17_-O2_-o_${this.file+'.out'}_${this.file}"
			// (but outputs are never exctracted from tar so they could have the same name)
			// It's more flexible
			Cmd: ((template, vars) => {
				return new Function('return `' + template + '`;').call(vars)
			})(compilerInstance.exec_command, { file: fileBasename }).split('_'),
			// Cmd: splitCommands(compilerInstance.exec_command).concat(file.replace(pathToFile, '')),
			// file name could be required to be first argument or appear more than once in compiler commands of some weird languages :D
			AttachStdout: false,
			AttachStderr: false,
			tty: false
		})

		await container.fs.put(`${filePureBasename}.tar`, { path: '.' })
			.then(stream => promisifyStream(stream))
		await unlinkAsync(`${filePureBasename}.tar`)
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
		return outfile
	} catch (err) {
		if (container !== undefined) await container.delete({ force: true })
		if (logs.length) throw logs.join()
		throw err
	}
}

/** Executes a program inside docker container
 * 
 * @param {string} exname Name of Execution Environment
 * @param {string} infile Path to input file, expects *.tar file 
 * @param {*} stdinfile Path to the file to be piped as stdin. (Defunct for now. Use other means e.g. /bin/bash -c "/a.out < input.txt" in ExecEnv def)
 * @returns {string} Output from running command
 */
function exec(exname, infile, stdinfile) {
	return new Promise(async (resolve, reject) => {
		const _execInstance = await execenv.ExecEnv.findOne({ name: exname });

		if (!_execInstance) {
			reject("Invalid ExecEnv");
			return;
		}

		try {
			const infilename = infile.replace(pathToFile, '')

			var _container = await docker.container.create({
				Image: _execInstance.image_name,
				// _execInstance.exec_command can be template string, it splits with '_'
				// Example of exec_command:
				// "bash_-c_chmod +x a.out ; ./a.out" 
				// (results in ['bash', '-c', 'chmod +x a.out ; ./a.out'])
				// or
				// "bash_-c_chmod +x ${this.file} ; ./${this.file}"
				Cmd: ((template, vars) => {
					return new Function('return `' + template + '`;').call(vars)
				})(_execInstance.exec_command, { file: infilename }).split('_'),
				// To tak nie działa Rudy :(
				// Teraz działa (Now it works :)
				//Cmd: splitCommands(_execInstance.exec_command.replace('[FILE]', infilename)),
				Memory: _execInstance.memory,
				AttachStdout: false,
				AttachStderr: false,
				AttachStdin: false,
				tty: false,
				OpenStdin: false,
				//interactive: (stdinfile ? true : false),
			})
			//await tar.c({ file: infile.replace(fileExtension, '.tar'), C: infile.match(pathToFile)[0] }, [infile.replace(pathToFile, '')])
			//Jeszcze nie, muszę ogarnąć podłączanie stdin. Jeśli się nie uda może się okazać że będziemy przesyłać w archiwum parę: exec i dane.
			const _unpromStream = await _container.fs.put(infile.replace(fileExtension, '.tar'), { path: '.' })
			await promisifyStreamNoSpam(_unpromStream);
			await _container.start();

			if (stdinfile) {
				console.log("Redirecting input.");
				var [_stdinstream,] = await _container.attach({ stream: true, stderr: true });
				var _fstrm = fs.createReadStream(stdinfile);
				_fstrm.pipe(_stdinstream) //readable->writable
				await promisifyStream(_fstrm);
			}

			//await _container.wait();

			await asyncWait(_execInstance.time);

			const inspection = await _container.status();

			if (inspection.data.State.Status !== 'exited') {
				await _container.kill();
				await _container.delete({ force: true });
				reject("Time Limit Exceeded");
				return;
			}
			//else await _container.stop();

			_unpromStream = await _container.logs({
				follow: true,
				stdout: true,
				stderr: true
			})

			const logs = new Array()

			await new Promise((resolve, reject) => {
				_unpromStream.on('data', (d) => logs.push(d.toString()))
				_unpromStream.on('end', resolve)
				_unpromStream.on('error', reject)
			})

			await _container.delete({ force: true });

			resolve(logs.join().replace(/[^\x20-\x7E]/g, '').trim())
			return;

		} catch (err) {
			if (_container !== undefined) {
				_container.delete({ force: true }).catch((e) => console.log("Failed to clean up after exec error, it is still alive! " + e));
			}
			reject("Failed at execution attempt: " + err);
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