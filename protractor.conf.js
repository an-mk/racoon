const { insertProblem } = require('./problems')
const { insertLang } = require('./langs')

exports.config = {
    framework: 'mocha',
    specs: [
        'test/e2e/*.spec.js'
    ],
    onPrepare: async () => {
        process.env.PORT = 3001
        require('./index')
        await insertProblem('Suma', '<p>Zsumuj a i b. </p> <b>Przykładowe wejście:</b> <code>a = 2 \nb = 10 </code> <b>Przykładowe wyjście:</b> <code>12</code>')
        await insertLang('C++', 'cpp', '#include <iostream>\nusing namespace std;\nint main() {\n\tcout<<\"Hello, World!\";\n\treturn 0;\n}', 'gcc', 'gcc')
        await insertLang('C', 'c', '#include <stdio.h>\nint main(void) {\n    printf(\"Hello, World!\");\n    return 0;\n}', 'gcc', 'gcc')
        // 1s for server to start
        return new Promise(resolve => setTimeout(resolve, 1000))
    } 
}