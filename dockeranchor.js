
const Docker = require('node-docker-api').Docker
const fs = require('fs');
const compiler = require('./compilers')

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
 [OPTIONAL] outfile - path where to put compiled file (with the new file name). Can be omitted to get the file in the working directory.
 Return value:
 pair (bool, path_to_file) - true on success, false on failure, and path to file. If false it will be .docker.log file. If true it will be the compiled file.
 
 Domyślnie wypluwa plik z rozszerzeniem .out.
 Od teraz daje inny plik o tej samej nazwie z rozszerzeniem .docker.log, który zawiera logi dockera, czyli w tym przebieg kompilacji, i błędy w jej trakcie.
 */
 function compile(comp, file, _outfile){
	//if(!(comp instanceof String))return false;
	
	const outfile = _outfile || file.replace(/\.[^/\\]*(?=$)/,'.out')
	
	let _container;
	let _compilerInstance;
	let _file;
	
	console.log("Let's compile! "+ file.replace(/^.*[/\\]/,''));
	compiler.Compiler.findOne({name : comp})
	.then((compilerInstance) => {
			_compilerInstance = compilerInstance;
			if(compilerInstance.shadow == true)return [true, file];
			return docker.container.create({
				Image: compilerInstance.image_name,
				Cmd: compilerInstance.exec_command.split(" ").concat(file.replace(/^.*[/\\]/,'')),
				//name: 'test-gcc',
				AttachStdout: false,
				AttachStderr: false,
				tty : false
	
			})
		}
	)
	.then((container) => {
		_container = container
		return _container.fs.put(file.replace(/\.[^/\\]*(?=$)/,'.tar'), {
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
	
	.catch((err)=>{
		console.log("Error during compilation: ", err);
		if(_container !== undefined){
			_container.logs({
				follow: true,
				stdout: true,
				stderr: true
			})
			.then(stream => {
				_file = fs.createWriteStream(outfile.replace(/\.[^/\\]*(?=$)/,'.docker.log'));
				stream.pipe(_file);
				return promisifyStreamNoSpam(stream);
			})
			.then(()=>
				_container.delete({force: true})
			)
			.catch((err)=> console.log("Error while getting compilation errors." + err.message))
		}
		return [false, _file];
	})
	.finally(()=>{
		console.log("Compiling is done.");
		return [true, _file];
	});
 
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
 
 module.exports =  {gccDetect, compile, nukeContainers}