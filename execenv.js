const db = require('./db.js')

const ExecEnv = db.model('ExecEnv', {
	name: { type: String, required: true, minlength: 1, maxlength: 256}, //Human readable name
	image_name: { type: String, required: true }, //Docker Image name
    exec_command: { type: String, required: true }, //Command to execute.
	output_name: { type: String, required: true }, // File name to redirect output.
	memory: {type: Number, required: true }, //Max memory for the environment (in bytes).
	time: {type: Number, required: true} //Max execution time (in ms). Temporarily defunct
});

const insertExecEnv= async (name, img, exec, out, memory, time) =>{
	const comp = new ExecEnv({name: name, image_name: img, exec_command: exec, output_name: out, memory: memory, time: time});
	const isFound = await ExecEnv.findOne({name : name });
	
	if(isFound)ExecEnv.deleteOne({name : name})
				.then(()=>console.log("Overrode ExecEnv: "+name))
				.catch((err)=>console.log("Failed to override ExecEnv: "+err));
	
	comp.save()
	.then(()=>console.log("ExecEnv added."))
	.catch((err)=>console.log("Failed to add ExecEnv to the database: "+err))
	.finally(()=> process.exit(0))
}

const listExecEnvs = async()=>{
	try{
		const cts = await ExecEnv.find({});
		cts.forEach( (ct)=>{
				console.log(ct);
		})
	}catch(e)
	{
		console.log("Failed to list ExecEnvs, "+e);
	}finally{
		console.log("Command finished.");
		process.exit(0);
	}

}

const remExecEnv = async (name)=>{
	ExecEnv.deleteOne({name : name})
		.then(()=>console.log("ExecEnv deleted."))
		.catch((err)=>console.log("Failed to delete ExecEnv: "+err))
		.finally(()=> process.exit(0))
}

module.exports = {insertExecEnv, remExecEnv, listExecEnvs, ExecEnv};