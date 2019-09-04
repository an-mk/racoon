const db = require('./db.js')

const User = db.model('User', {
    name: { type: String, required: true, unique: true, minlength: 1, maxlength: 256},
    pswdHash: { type: String, required: true }
})

module.exports = User;