#!/usr/bin/env node

const dockeranchor = require('./dockeranchor.js')
const compilers = require('./compilers.js')
const execnv = require('./execenv.js')
const program = require('commander');
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
    .action((a, b, c) => {
        dockeranchor.compile(a, b, c).then((m) => { console.log("Success " + m) }, (err) => { console.log("Compilation failed, but we've got logs. " + err) });
    })
//---------------------
program.command('exec <execEnvName> <pathToFile> <outputPath> [fileToStdin]')
    .alias('e')
    .description('Executes program inside a docker container. Outputs a file.')
    .action((a, b, c, d) => {
        dockeranchor.exec(a, b, c, d).then((m) => { console.log("Exec success " + m) }, (err) => { console.log("Exec failed, with reason: " + err) });
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
program.command('nukeDockerContainers')
    .alias('ndc-sure')
    .description('Kills and deletes all docker containers. Useful if app did not exit cleanly last time.')
    .action(() => {
        dockeranchor.nukeContainers();
    })

program.parse(process.argv);