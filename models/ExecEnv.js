const db = require('../db.js')

const ExecEnv = db.model('ExecEnv', {
    name: { type: String, required: true, minlength: 1, maxlength: 256 }, //Human readable name
    image_name: { type: String, required: true }, //Docker Image name
    exec_command: { type: String, required: true }, //Command to execute.
   // output_name: { type: String, required: true }, // File name to redirect output.
    memory: { type: Number, required: true }, //Max memory for the environment (in bytes).
    time: { type: Number, required: true } //Max execution time (in ms).
});

module.exports = ExecEnv