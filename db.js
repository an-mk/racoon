const mongoose = require('mongoose')

const dbPassword = process.env.MONGOPSWl
const dbHost = process.env.MONGOHOST
const dbUrl = process.env.MONGOURL || `mongodb+srv://dbUser:${dbPassword}@${dbHost}/sprawdzarka?retryWrites=true&w=majority`

mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true }, () => {
    console.log('DB connection established')
}).catch(err => console.error(err))

mongoose.connection.on('error', err => console.error(err))

module.exports = mongoose