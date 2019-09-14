exports.config = {
    framework: 'mocha',
    specs: [
        'test/e2e/*.spec.js'
    ],
    onPrepare: () => {
        process.env.PORT = 3001
        require('./index')
        // 100ms for server to start
        return new Promise(resolve => setTimeout(resolve, 100))
    } 
}