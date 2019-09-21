const mongoose = require('mongoose')

const dbPassword = process.env.MONGOPSW
const dbHost = process.env.MONGOHOST
const dbUname = process.env.MONGOUNAME
const dbUrl = process.env.MONGOURL || `mongodb+srv://${dbUname}:${dbPassword}@${dbHost}/sprawdzarka?retryWrites=true&w=majority`

mongoose.set('useFindAndModify', false);

mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('DB connection established')
}).catch(err => console.error(err))

mongoose.connection.on('error', err => console.error(err))

if (process.env.MONGODEBUG == 'true') {
    mongoose.set('debug', true)
}

module.exports = mongoose