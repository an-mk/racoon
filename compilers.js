const Compiler = require('./models/Compiler')

const insertCompiler = async (name, img, exec, out, _shadow) => {
	const shadow = _shadow === true;

	const comp = new Compiler({ name: name, image_name: img, exec_command: exec, output_name: out, shadow: shadow });
	const isFound = await Compiler.findOne({ name: name });

	if (isFound) Compiler.deleteOne({ name: name })
		.then(() => console.log("Overrode compiler: " + name))
		.catch((err) => console.log("Failed to override compiler: " + err));

	comp.save()
		.then(() => console.log("Compiler added."))
		.catch((err) => console.log("Failed to add compiler to the database: " + err))
		.finally(() => process.exit(0))
	//process.exit(0);
}

const listCompilers = async () => {

	try {
		const cts = await Compiler.find({});

		cts.forEach((ct) => {
			console.log(ct);
		})
	} catch (e) {
		console.log("Failed to list compilers, " + e);
	} finally {
		console.log("Command finished.");
		process.exit(0);
	}

}

const remCompiler = async (name) => {
	Compiler.deleteOne({ name: name })
		.then(() => console.log("Compiler deleted."))
		.catch((err) => console.log("Failed to delete compiler: " + err))
		.finally(() => process.exit(0))
}
module.exports = { insertCompiler, remCompiler, listCompilers, Compiler };