const db = require('../db.js')

const Compiler = db.model('Compiler', {
    name: { type: String, required: true, minlength: 1, maxlength: 256 }, // Human readable name
    image_name: { type: String, required: true }, //Docker Image name
    exec_command: { type: String, required: true }, //Command to compile. Doesn't matter with shadow.
    output_name: { type: String, required: true }, // Expected output file name. Doesn't matter with shadow.
    shadow: { type: Boolean, default: false }	//Whether the compiler is expected to do sth, or we should jump to the interpreter.
});

module.exports = Compiler