"use strict";
const Docker = require('node-docker-api').Docker
const fs = require('fs');
const compiler = require('./compilers')
const execenv = require('./execenv')

const dockerProto = process.env.RACOONDOCKERPROTO || 'http'
const dockerHost = process.env.RACOONDOCKERHOST || '192.168.99.100'
const dockerPort = process.env.RACOONDOCKERPORT || 2376

const docker = new Docker({protocol: dockerProto, host: dockerHost, port: dockerPort  })

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

function gccDetect(){

	docker.container.create({
	Image: 'gcc',
	Cmd: [ '/bin/bash' ],
	name: 'test-gcc',
	AttachStdout: false,
	AttachStderr: false,
	tty : true
	})
	.then((container) => container.start())
	.then((container) => {
		_container = container
		return container.exec.create({
		AttachStdout: true,
		AttachStderr: true,
		Cmd: [ 'gcc', '--version']
		})
	})
	.then((exec) => {
		return exec.start({ detach: false })
	})
	.then((stream) => promisifyStream(stream))
	.then(() => _container.kill())
	.then(() => _container.delete({force : true}))
	.then(() => console.log("Testowy kontener skasowany.") )
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
 function compile(comp, file, _outfile){
	return new Promise(async(_resolve, _reject) => {
	
	const outfile = _outfile || file.replace(fileExtension,'.out')
	
	let _container;
	var _file;
	
	console.log("Let's compile! "+ file.replace(pathToFile,''));
	
	const _compilerInstance = await compiler.Compiler.findOne({name : comp});

	if(!_compilerInstance){
		_reject("Invalid compiler name");
		return;
	}
	
	if(_compilerInstance.shadow === true){
		_resolve( file );
		return;
	}
	
	docker.container.create({
			Image: _compilerInstance.image_name,
			Cmd: _compilerInstance.exec_command.split(" ").concat(file.replace(pathToFile,'')),
			AttachStdout: false,
			AttachStderr: false,
			tty : false
	
		})
	.then((container) => {
		_container = container
		return _container.fs.put(file.replace(fileExtension,'.tar'), {
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
	.then(()=>
		_container.delete({force :true})
	)
	.then(()=>
		_resolve( _file.path )
	)
	.catch((err)=>{
		console.log("Error during compilation: ", err);
		if(_container !== undefined){
			_container.logs({
				follow: true,
				stdout: true,
				stderr: true
			})
			.then(stream => {
				_file = fs.createWriteStream(outfile.replace(fileExtension,'.docker.log'));
				stream.pipe(_file);	
				return promisifyStreamNoSpam(stream);		

			})
			.then(()=>{
				_container.delete({force: true})
				_reject (_file.path)
			})
			.catch((err)=> console.log("Error while getting compilation errors." + err.message))
		}
		else _reject( err );
		
	})
	.finally(()=>{
		console.log("Compiling is done.");
	});
 })
 }
 /** Executes a program inside docker container
  * 
  * @param {*} exname Name of Execution Environment
  * @param {*} infile Path to input file
  * @param {*} outfile Path where to redirect stout&stderr from the container.
  */
 function exec(exname, infile, outfile) {
	 return new Promise( async(resolve, reject)=>{
		const _execInstance = await execenv.ExecEnv.findOne({name : exname});

		if(!_execInstance){
			reject("Invalid ExecEnv");
			return;
		}

		try{

			const _container = await docker.container.create({
					Image: _execInstance.image_name,
					Cmd: _execInstance.exec_command.split(" ").concat(infile.replace(pathToFile, '')),
					Memory: _execInstance.memory,
					AttachStdout: false,
					AttachStderr: false,
					tty : false
			})

			let _unpromStream = await _container.fs.put(infile.replace(fileExtension,'.tar'), {path: '.'})
			let _promStream = await promisifyStream(_unpromStream);
			await _container.start();
			await _container.wait();
			_unpromStream = await _container.logs({
				follow: true,
				stdout: true,
				stderr: true
			})

			let _file = fs.createWriteStream(outfile);
			_unpromStream.pipe(_file);
			await promisifyStreamNoSpam(_unpromStream);

			await _container.delete({force: true});

			resolve(outfile)
			return;

		}catch(err){
			reject("Failed at execution attempt: "+err);
			return;
		}

	 })
 }

 
 async function nukeContainers(quit){
	const shouldQuit = quit !== false;
	
	var conts = await docker.container.list({all: true});
	console.log("NUKING DOCKER!, containers=", conts.length);
	var promises = conts.map(function (cont) {
		let cname = undefined
		return cont.start()
		.then(()=>cont.kill())
		.then(()=>cont.delete({force:true}))
		.catch((err)=>console.log("There is always a catch. Nuking docker failed. Try: docker kill $(docker ps -aq) && docker rm $(docker ps -aq) , on the docker machine instead. " + err))
		.finally(()=>console.log(`Nuking ${cname} done`));
	})
	
	Promise.all(promises).then(function () {
		if(shouldQuit)process.exit(0);
	})
 }
 
 module.exports =  {gccDetect, compile, exec, nukeContainers}