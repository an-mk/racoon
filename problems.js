const Problem = require('./models/Problem');

const insertProblem = async (name, content) => {
    const problem = new Problem({ name: name, content: content });
    const isFound = await Problem.findOne({ name: name });

    if (isFound) Problem.deleteOne({ name: name })
        .then(() => console.log("Overrode Problem: " + name))
        .catch((err) => console.log("Failed to override Problem: " + err));
    await problem.save()
        .then(() => console.log("Problem added."))
        .catch((err) => console.log("Failed to add Problem to the database: " + err))
}

const remProblem = async (name) => {
	Problem.deleteOne({ name: name })
		.then(() => console.log("Problem deleted."))
		.catch((err) => console.log("Failed to delete Problem: " + err))
}

module.exports = { insertProblem, remProblem}