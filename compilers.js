const db = require('./db.js')

const Compiler = db.model('Compiler', {
    name: { type: String, required: true, minlength: 1, maxlength: 256}, // Human readable name
	image_name: { type: String, required: true }, //Docker Image name
    exec_command: { type: String, required: true }, //Command to compile. Doesn't matter with shadow.
	output_name: { type: String, required: true }, // Expected output file name. Doesn't matter with shadow.
	shadow: {type: Boolean, default: false }	//Whether the compiler is expected to do sth, or we should jump to the interpreter.
});

const insertCompiler = async (name, img, exec, out, _shadow) =>{
	const shadow = _shadow === true;
	
	const comp = new Compiler({name: name, image_name: img, exec_command: exec, output_name: out, shadow: shadow});
	const isFound = await Compiler.findOne({name : name });
	
	if(isFound)Compiler.deleteOne({name : name})
				.then(()=>console.log("Overrode compiler: "+name))
				.catch((err)=>console.log("Failed to override compiler: "+err));
	
	comp.save()
	.then(()=>console.log("Compiler added."))
	.catch((err)=>console.log("Failed to add compiler to the database: "+err))
	.finally(()=> process.exit(0))
	//process.exit(0);
}

const listCompilers = async()=>{

	try{
		const cts = await Compiler.find({});
		
		cts.forEach( (ct)=>{
				console.log(ct);
		})
	}catch(e)
	{
		console.log("Failed to list compilers, "+e.message);
	}finally{
		console.log("Command finished.");
		process.exit(0);
	}

}

const remCompiler = async (name)=>{
	Compiler.deleteOne({name : name})
		.then(()=>console.log("Compiler deleted."))
		.catch((err)=>console.log("Failed to delete compiler: "+err))
		.finally(()=> process.exit(0))
}
module.exports = {insertCompiler, remCompiler, listCompilers, Compiler};