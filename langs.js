'use strict';

const Lang = require('./models/Lang');

const insertLang = async (name, monaco, snippet, compiler, execenv) => {
	const comp = new Lang({ name: name, monacoName: monaco, codeSnippet: snippet, compiler: compiler, execenv: execenv });
	const isFound = await Lang.findOne({ name: name });

	if (isFound) Lang.deleteOne({ name: name })
		.then(() => console.log("Overrode Lang: " + name))
		.catch((err) => console.log("Failed to override Lang: " + err));

	comp.save()
		.then(() => console.log("Lang added."))
		.catch((err) => console.log("Failed to add Lang to the database: " + err))
}

const listLangs = async () => {
	try {
		const cts = await Lang.find({});
		cts.forEach((ct) => {
			console.log(ct);
		})
	} catch (e) {
		console.log("Failed to list Langs, " + e);
	} finally {
		console.log("Command finished.");
	}

}

const remLang = async (name) => {
	Lang.deleteOne({ name: name })
		.then(() => console.log("Lang deleted."))
		.catch((err) => console.log("Failed to delete Lang: " + err))
}

module.exports = { insertLang, remLang, listLangs, Lang };
