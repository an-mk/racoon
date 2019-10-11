const mongoose = require('mongoose')

const dbPassword = process.env.RACOONMONGOPSW
const dbHost = process.env.RACOONMONGOHOST
const dbUname = process.env.RACOONMONGOUNAME
const dbUrl = process.env.RACOONMONGOURL || `mongodb+srv://${dbUname}:${dbPassword}@${dbHost}/sprawdzarka?retryWrites=true&w=majority`

mongoose.set('useFindAndModify', false);

mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('DB connection established')
}).catch(err => console.error(err))

mongoose.connection.on('error', err => console.error(err))

if (process.env.RACOONMONGODEBUG == 'true') {
    mongoose.set('debug', true)
}

module.exports = mongoose