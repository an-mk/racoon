#!/usr/bin/env node

const dockeranchor = require('../dockeranchor.js')
const compilers = require('./compilers.js')
const execnv = require('./execenv.js')
const langs = require('./langs.js')
const checkEnvs = require('./checkEnvs.js')
const problems = require('../problems.js')
const tests = require('../tests.js')
const program = require('commander')
const fs = require('fs')
const { promisify } = require('util')
const writeFileAsync = promisify(fs.writeFile)
program.version(require('../package.json').version);

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
program.command('exec <execEnvName> <pathToFile> [fileToStdin] [outputFile]')
    .alias('e')
    .description('Executes program inside a docker container. Outputs a file.')
    .action(async (a, b, ...args) => {
        await dockeranchor.exec(a, b, ...args).then(async (m) => {
            console.log('Sucess: ')
            console.log(m)
            if(typeof outputFile !== 'undefined')await writeFileAsync(c, m);
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

    program.command('addCheckEnv <name> <execEnv> <usesBinary> [compiler]')
    .alias('achenv')
    .description('Adds checkEnv.')
    .action((name, execEnv, usesBinary, compiler) => {
        checkEnvs.insertCheckEnv(name, execEnv, usesBinary, compiler).then(() => process.exit(0))
    })

program.command('remCheckEnv <name>')
    .alias('rchenv')
    .description('Removes a checkEnv.')
    .action((a) => {
        checkEnvs.remCheckEnv(a).then(() => process.exit(0))
    })

program.command('listCheckEnvs')
    .alias('chenvs')
    .description('Lists all checkEnvs.')
    .action(() => {
        checkEnvs.listCheckEnv().then(() => process.exit(0))
    })
//-----------------
program.command('addProblem <name> <content> <checkEnv> [checkerCode]')
    .alias('aprb')
    .description('Adds a problem. Checker code is required for checkEnvs using them')
    .action(async (name, content, checkEnv, checkerCode) => {
        content = content.replace(/\\t/g, '\t').replace(/\\n/g, '\n').replace(/\\r/g, '')
        var stream = undefined;
        if (checkerCode !== undefined)
        stream = fs.createReadStream(checkerCode);
        await problems.insertProblem(name, content, checkEnv, stream).then(x => {
            console.log(x[1]);
        }, console.log)
        process.exit(0)
    })

program.command('remProblem <name>')
    .alias('rprb')
    .description('Removes a problem.')
    .action((name) => {
        problems.remProblem(name).then(() => process.exit(0))
    })

//-----------------
program.command('insertTest <problem> <pathToFile> <pathToOutFile>')
    .alias('atst')
    .description('Inserts a test')
    .action(async (problem, file, outFile)=>{
        var stream = fs.createReadStream(file);
        var outStream = fs.createReadStream(outFile);
        await tests.insertTest(problem, stream, outStream).then(_ => {
            console.log("OK");
        }, console.log)
        process.exit(0)
    })
//-----------------
program.command('nukeDockerContainers')
    .alias('ndc-sure')
    .description('Kills and deletes all docker containers. Useful if app did not exit cleanly last time.')
    .action(() => {
        dockeranchor.nukeContainers(true);
    })

program.parse(process.argv);