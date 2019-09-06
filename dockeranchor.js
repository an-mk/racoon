
const Docker = require('node-docker-api').Docker

const dockerProto = process.env.RACOONDOCKERPROTO || 'http'
const dockerHost = process.env.RACOONDOCKERHOST || '192.168.99.100'
const dockerPort = process.env.RACOONDOCKERPORT || 2376

const docker = new Docker({protocol: dockerProto, host: dockerHost, port: dockerPort  })


const promisifyStream = (stream) => new Promise((resolve, reject) => {
  stream.on('data', (d) => console.log(d.toString()))
  stream.on('end', resolve)
  stream.on('error', reject)
})
let _container

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
		Cmd: [ 'gcc', '--version', ]
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
 
 module.exports =  gccDetect()