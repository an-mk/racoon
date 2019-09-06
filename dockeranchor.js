
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
 
 function compile(comp, file){
	//if(!(comp instanceof String))return false;
	
	let _container;
	let _compilerInstance;
	
	console.log("Let's compile! "+ file.replace(/^.*[/\\]/,''));
	compiler.Compiler.findOne({name : comp})
	.then((compilerInstance) => {
			_compilerInstance = compilerInstance;
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
		const _file = fs.createWriteStream(file.replace(/\.[^/\\]*(?=$)/,'.out'));
		stream.pipe(_file);
		return promisifyStreamNoSpam(stream);
	})
	
	.catch((err)=>console.log("Error during compilation: ", err))
	.finally(()=>console.log("Compiling is done."));
 
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