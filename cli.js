#!/usr/bin/env node

const dockeranchor = require('./dockeranchor.js')
const compilers = require('./compilers.js')
const execnv = require('./execenv.js')
const langs = require('./langs.js')
const problems = require('./problems.js')
const program = require('commander')
const fs = require('fs')
const { promisify } = require('util')
const writeFileAsync = promisify(fs.writeFile)
program.version(require('./package.json').version);

program.command('addCompiler <compilerName> <imageInDocker> <buildCommand> <outputFileName>')
    .alias('adc')
    .description('Adds a compiler for the app to use.')
    .option('-s, --shadow', 'Is a shadow compiler.')
    .action((a, b, c, d, cmdObj) => {
        compilers.insertCompiler(a, b, c, d, cmdObj.shadow);
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
    .action(async (a, b, c) => {
        await dockeranchor.compile(a, b, c).then((m) => { console.log("Success " + m) }, (err) => { console.log("Compilation failed, but we've got logs. ", err) });
        process.exit(0)
    })
//---------------------
program.command('exec <execEnvName> <pathToFile> <outputPath> [fileToStdin]')
    .alias('e')
    .description('Executes program inside a docker container. Outputs a file.')
    .action(async (a, b, c, ...args) => {
        await dockeranchor.exec(a, b, ...args).then(async (m) => {
            console.log('Sucess: ')
            console.log(m)
            await writeFileAsync(c, m)
        }, (err) => { console.log("Exec failed, with reason: " + err) });
        process.exit(0)
    })

program.command('addExecEnv <envName> <imageInDocker> <execCommand> <memLimit> <timeLimit>')
    .alias('adx')
    .description('Adds an execution environment for the app to use.')
    .action((...args) => {
        execnv.insertExecEnv(...args);
    })

program.command('remExecEnv <compilerName>')
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

program.command('addLang <name> <nameInMonaco> <codeSnippet> <compiler> <execEnv>')
    .alias('alang')
    .description('Adds a programming language.')
    .action((name, nameInMonaco, codeSnippet, ...args) => {
        // Fixes escaping problems on Windows (powershell)
        codeSnippet = codeSnippet.replace(/\\t/g, '\t').replace(/\\n/g, '\n').replace(/\\r/g, '')
        langs.insertLang(name, nameInMonaco, codeSnippet, ...args).then(() => process.exit(0))
    })

program.command('remLang <name>')
    .alias('rlang')
    .description('Removes a language.')
    .action((a) => {
        langs.remLang(a).then(() => process.exit(0))
    })

program.command('listLangs')
    .alias('langs')
    .description('Lists all programming languages.')
    .action(() => {
        langs.listLangs().then(() => process.exit(0))
    })
//-----------------
program.command('addProblem <name> <content>')
    .alias('aprb')
    .description('Adds a problem.')
    .action((name, content) => {
        content = content.replace(/\\t/g, '\t').replace(/\\n/g, '\n').replace(/\\r/g, '')
        problems.insertProblem(name, content).then(() => process.exit(0))
    })

program.command('remProblem <name>')
    .alias('rprb')
    .description('Removes a problem.')
    .action((name) => {
        problems.remProblem(name).then(() => process.exit(0))
    })
//-----------------
program.command('nukeDockerContainers')
    .alias('ndc-sure')
    .description('Kills and deletes all docker containers. Useful if app did not exit cleanly last time.')
    .action(() => {
        dockeranchor.nukeContainers(true);
    })

program.parse(process.argv);