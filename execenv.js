const db = require('./db.js')

const ExecEnv = db.model('ExecEnv', {
	name: { type: String, required: true, minlength: 1, maxlength: 256}, //Human readable name
	image_name: { type: String, required: true }, //Docker Image name
    exec_command: { type: String, required: true }, //Command to execute.
	output_name: { type: String, required: true }, // File name to redirect output.
	memory: {type: Integer, required: true }, //Max memory per environment.
	time: {type: Integer, required: true} //Max execution time.
});