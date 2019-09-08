const db = require('../db.js')

const User = db.model('User', {
    name: { type: String, required: true, minlength: 1, maxlength: 256 },
    pswdHash: { type: String, required: true },
    elevated: { type: Boolean, required: true, default: false }
})

module.exports = User;