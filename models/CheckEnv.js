const db = require('../db.js')

const CheckEnv = db.model('CheckEnv', {
    name: { type: String, required: true },
    execEnv: { type: String, required: true },
    usesBinary: { type: Boolean, required: true },
    compiler: { type: String }
})

module.exports = CheckEnv;