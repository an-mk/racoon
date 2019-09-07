const express = require('express')
const helmet = require('helmet')
const app = express()
const session = require('express-session')
const cryptoRandomString = require('crypto-random-string')
const dockeranchor = require('./dockeranchor.js')
const compilers = require('./compilers.js')
const execnv = require('./execenv.js')
const program = require('commander');
program.version('0.0.1');

const port = process.env.SPRPORT || process.env.PORT || 3000

app.use(session({
	name: 'sprciacho',
	secret: cryptoRandomString({ length: 10 }),
	resave: false,
	saveUninitialized: false,
	cookie: { sameSite: true }
}))

app.use('/', express.static(`${__dirname}/public`))
app.get('/', (_req, res) => res.sendFile(`${__dirname}/public/index.html`))
app.use(express.json())
app.use(helmet())
app.disable('x-powered-by')

app.use('/api', require('./api'))
// adds POST /api/users/create etc.

app.get('*', (_req, res) => res.sendFile(`${__dirname}/public/index.html`))

app.listen(port, () => console.log(`Running on port ${port}`))

program.command('addCompiler <compilerName> <imageInDocker> <buildCommand> <outputFileName>') 
  .alias('adc')
  .description('Adds a compiler for the app to use.')
  .option('-s, --shadow', 'Is a shadow compiler.')
  .action((a,b,c,d, cmdObj) => {
	compilers.insertCompiler(a,b,c,d, cmdObj.shadow);
  })
  
program.command('remCompiler <compilerName>') 
  .alias('rmc')
  .description('Removes a compiler for the app to use.')
  .action((a) => {
	compilers.remCompiler(a);
  })
  
program.command('listCompilers') 
  .alias('lsc')
  .description('Lists all previously configured compilers.')
  .action(() => {
	compilers.listCompilers();
  })
  
program.command('compile <compilerName> <pathToFile> [outputPath]') 
  .alias('cmp')
  .description('Compiles program inside a docker container. Outputs a binary file.')
  .action((a,b,c) => {
	dockeranchor.compile(a,b,c).then((m)=>{console.log("Success "+m)}, (err)=>{console.log("Compilation failed, but we've got logs. "+ err)});
  })
  //---------------------
program.command('exec <execEnvName> <pathToFile> <outputPath>') 
  .alias('e')
  .description('Executes program inside a docker container. Outputs a file.')
  .action((a,b,c) => {
      dockeranchor.exec(a,b,c).then((m)=>{console.log("Exec success "+m)}, (err)=>{console.log("Exec failed, with reason: "+ err)});
  })

program.command('addExecEnv <envName> <imageInDocker> <execCommand> <outputFileName> <memLimit> <timeLimit>') 
  .alias('adx')
  .description('Adds an execution environment for the app to use.')
  .action((...args) => {
	execnv.insertExecEnv(...args);
  })

 program.command('remExecEnv<compilerName>') 
  .alias('rex')
  .description('Removes an execution environment for the app to use.')
  .action((a) => {
  execnv.remExecEnv(a);
  })
  
program.command('listExecEnvs') 
  .alias('lex')
  .description('Lists all previously configured exec environments.')
  .action(() => {
  execnv.listExecEnvs();
  })
//-----------------
program.command('nukeDockerContainers') 
  .alias('ndc-sure')
  .description('Kills and deletes all docker containers. Useful if app did not exit cleanly last time.')
  .action(() => {
	dockeranchor.nukeContainers();
  })
  
program.parse(process.argv);