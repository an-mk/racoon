
const CheckEnv = require('../models/CheckEnv.js')
const File = require('../models/File.js')

const insertCheckEnv = async (name, execEnv, usesBinary, compiler) => {
    const checkEnv = new CheckEnv({ name: name, execEnv: execEnv, usesBinary: usesBinary });
    if (usesBinary) {
        checkEnv.compiler = compiler
    }

	const oldEnv = await CheckEnv.findOne({ name: name });
	if (oldEnv) await CheckEnv.deleteOne({ name: name })
		.then(() => console.log("Overriding checkEnv: " + name))

	await checkEnv.save()
			  .then(() => console.log("CheckEnv added."))
			  .catch((err) => console.log("Failed to checkEnv to the database: " + err))
}

const listCheckEnv = async () => {
	try {
		const envs = await CheckEnv.find({}).lean();
		envs.forEach((env) => {
			console.log(env);
		})
	} catch (e) {
		console.log("Failed to list CheckEnvs, " + e);
	} finally {
		console.log("Command finished.");
	}
}

const remCheckEnv = async (name) => {
	CheckEnv.deleteOne({ name: name })
		.then(() => console.log("CheckEnv deleted."))
		.catch((err) => console.log("Failed to delete CheckEnv: " + err))
}

module.exports = { insertCheckEnv, listCheckEnv, remCheckEnv, CheckEnv };
