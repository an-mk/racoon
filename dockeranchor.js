﻿"use strict";
const Docker = require('node-docker-api').Docker
const fs = require('fs');
const compiler = require('./compilers')
const execenv = require('./execenv')
const tar = require('tar')

const dockerProto = process.env.RACOONDOCKERPROTO || 'http'
const dockerHost = process.env.RACOONDOCKERHOST || '127.0.0.1'
const dockerPort = process.env.RACOONDOCKERPORT || 2375

const docker = new Docker({ protocol: dockerProto, host: dockerHost, port: dockerPort })

const promisifyStream = (stream) => new Promise((resolve, reject) => {
	stream.on('data', (d) => console.log(d.toString()))
	stream.on('end', resolve)
	stream.on('error', reject)
})

const promisifyStreamNoSpam = (stream) => new Promise((resolve, reject) => {
	stream.on('end', resolve)
	stream.on('error', reject)
})

const fileExtension = /\.[^/\\]*(?=$)/;
const pathToFile = /^.*[/\\]/;

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
 
Domyślnie wypluwa plik z rozszerzeniem .out.
Od teraz daje inny plik o tej samej nazwie z rozszerzeniem .docker.log, który zawiera logi dockera, czyli w tym przebieg kompilacji, i błędy w jej trakcie.
*/
async function compile(comp, file, _outfile) {
	const logs = new Array()
	try {
		const outfile = _outfile || file.replace(fileExtension, '.out')
		console.log("Let's compile! " + file.replace(pathToFile, ''));

		const compilerInstance = await compiler.Compiler.findOne({ name: comp });

		if (!compilerInstance)
			throw ("Invalid compiler name");

		if (compilerInstance.shadow === true)
			return file

		await tar.c({ file: file.replace(fileExtension, '.tar') }, [file])

		const container = await docker.container.create({
			Image: compilerInstance.image_name,
			Cmd: compilerInstance.exec_command.split(' ').concat(file.replace(pathToFile, '')),
			AttachStdout: false,
			AttachStderr: false,
			tty: false
		})

		await container.fs.put(file.replace(fileExtension, '.tar'), { path: '.' })
			.then(stream => promisifyStream(stream))
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
		const realoutfile = await new Promise((resolve, _reject) => {
			tar.t({
				file: outfile,
				onentry: entry => resolve(entry.path)
			})
		})
		await tar.x({ file: outfile })
		fs.renameSync(realoutfile, outfile)
		return outfile
	} catch (err) {
		if (logs.length) throw logs.join()
		throw err
	}
}
/*function compile(comp, file, _outfile) {
	return new Promise(async (_resolve, _reject) => {

		const outfile = _outfile || file.replace(fileExtension, '.out')

		let _container;
		var _file;

		console.log("Let's compile! " + file.replace(pathToFile, ''));

		const _compilerInstance = await compiler.Compiler.findOne({ name: comp });

		if (!_compilerInstance) {
			_reject("Invalid compiler name");
			return;
		}

		if (_compilerInstance.shadow === true) {
			_resolve(file);
			return;
		}

		docker.container.create({
			Image: _compilerInstance.image_name,
			Cmd: _compilerInstance.exec_command.split(" ").concat(file.replace(pathToFile, '')),
			AttachStdout: false,
			AttachStderr: false,
			tty: false

		})
			.then((container) => {
				_container = container
				return _container.fs.put(file.replace(fileExtension, '.tar'), {
					path: '.'
				})
			})
			.then(stream => promisifyStream(stream))
			.then(() =>
				_container.start()
			)
			.then(() => _container.wait())
			.then(() => _container.fs.get({ path: _compilerInstance.output_name }))
			.then(stream => {
				_file = fs.createWriteStream(outfile);
				stream.pipe(_file);
				return promisifyStreamNoSpam(stream);
			})
			.then(() =>
				_container.delete({ force: true })
			)
			.then(() =>
				_resolve(_file.path)
			)
			.catch((err) => {
				console.log("Error during compilation: ", err);
				if (_container !== undefined) {
					_container.logs({
						follow: true,
						stdout: true,
						stderr: true
					})
						.then(stream => {
							_file = fs.createWriteStream(outfile.replace(fileExtension, '.docker.log'));
							stream.pipe(_file);
							return promisifyStreamNoSpam(stream);

						})
						.then(() => {
							_container.delete({ force: true })
							_reject(_file.path)
						})
						.catch((err) => console.log("Error while getting compilation errors." + err.message))
				}
				else _reject(err);

			})
			.then(() => {
				console.log("Compiling is done.");
			});
	})
}*/
/** Executes a program inside docker container
 * 
 * @param {*} exname Name of Execution Environment
 * @param {*} infile Path to input file
 * @param {*} outfile Path where to redirect stout&stderr from the container.
 */
function exec(exname, infile, outfile) {
	return new Promise(async (resolve, reject) => {
		const _execInstance = await execenv.ExecEnv.findOne({ name: exname });

		if (!_execInstance) {
			reject("Invalid ExecEnv");
			return;
		}

		try {
			const infilename = infile.replace(pathToFile, '')

			const _container = await docker.container.create({
				Image: _execInstance.image_name,
				//TODO: Make it universal
				Cmd: [`bash', '-c', 'chmod +x ${infilename} ; ./${infilename}`],//_execInstance.exec_command.split(" ").concat(infile.replace(pathToFile, '')),
				Memory: _execInstance.memory,
				AttachStdout: false,
				AttachStderr: false,
				tty: false
			})
			await tar.c({ file: infile.replace(fileExtension, '.tar') }, [infile])
			let _unpromStream = await _container.fs.put(infile.replace(fileExtension, '.tar'), { path: '.' })
			let _promStream = await promisifyStream(_unpromStream);
			await _container.start();

			_unpromStream = await _container.logs({
				follow: true,
				stdout: true,
				stderr: true
			})
			await _container.wait();

			//let _file = fs.createWriteStream(outfile);
			//_unpromStream.pipe(_file);
			const logs = new Array()

			await new Promise((resolve, reject) => {
				_unpromStream.on('data', (d) => logs.push(d.toString()))
				_unpromStream.on('end', resolve)
				_unpromStream.on('error', reject)
			})

			await _container.delete({ force: true });

			resolve(logs.join().trim())
			return;

		} catch (err) {
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