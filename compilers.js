const db = require('./db.js')

const Compiler = db.model('Compiler', {
    name: { type: String, required: true, minlength: 1, maxlength: 256},
	image_name: { type: String, required: true }, //Docker Image name
    exec_command: { type: String, required: true }, //Command to compile
	output_name: { type: String, required: true } // Expected output file name
})

const insertCompiler = async (name, img, exec, out) =>{
	const comp = new Compiler({name: name, image_name: img, exec_command: exec, output_name: out});
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

const remCompiler = async (name)=>{
	Compiler.deleteOne({name : name})
		.then(()=>console.log("Compiler deleted."))
		.catch((err)=>console.log("Failed to delete compiler: "+err))
		.finally(()=> process.exit(0))
}
module.exports = {insertCompiler, remCompiler, Compiler};