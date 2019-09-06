const express = require('express')
const helmet = require('helmet')
const app = express()
const session = require('express-session')
const cryptoRandomString = require('crypto-random-string')
const dockeranchor = require('./dockeranchor.js')
const compilers = require('./compilers.js')
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
  .action((a,b,c,d) => {
	compilers.insertCompiler(a,b,c,d);
  })
  
 program.command('remCompiler <compilerName>') 
  .alias('rmc')
  .description('Removes a compiler for the app to use.')
  .action((a,b,c,d) => {
	compilers.remCompiler(a);
  })
  
program.parse(process.argv);