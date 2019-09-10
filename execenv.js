const ExecEnv = require("./models/ExecEnv")

const insertExecEnv = async (name, img, exec, memory, time) => {
	const comp = new ExecEnv({ name: name, image_name: img, exec_command: exec, memory: memory, time: time });
	const isFound = await ExecEnv.findOne({ name: name });

	if (isFound) ExecEnv.deleteOne({ name: name })
		.then(() => console.log("Overrode ExecEnv: " + name))
		.catch((err) => console.log("Failed to override ExecEnv: " + err));

	comp.save()
		.then(() => console.log("ExecEnv added."))
		.catch((err) => console.log("Failed to add ExecEnv to the database: " + err))
		.then(() => process.exit(0))
}

const listExecEnvs = async () => {
	try {
		const cts = await ExecEnv.find({});
		cts.forEach((ct) => {
			console.log(ct);
		})
	} catch (e) {
		console.log("Failed to list ExecEnvs, " + e);
	} finally {
		console.log("Command finished.");
		process.exit(0);
	}

}

const remExecEnv = async (name) => {
	ExecEnv.deleteOne({ name: name })
		.then(() => console.log("ExecEnv deleted."))
		.catch((err) => console.log("Failed to delete ExecEnv: " + err))
		.then(() => process.exit(0))
}

module.exports = { insertExecEnv, remExecEnv, listExecEnvs, ExecEnv };