const db = require('../db.js')

const Lang = db.model('Lang', {
    name: { type: String, required: true },
    monacoName: { type: String, required: true },
    codeSnippet: { type: String, default: ''},
    compiler: {type: String, required: true},
    execenv: {type: String, required: true}
});

module.exports = Lang;