const User = require('../models/User')
const router = require('express').Router()
const { check, validationResult } = require('express-validator')
const bcrypt = require('bcrypt')

router.post('/', [
    check('name').isString().not().isEmpty(),
    check('pswd').isString().not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    const user = await User.findOne({ name: req.body.name })

    //User does not exist
    if (!user)
        return res.status(401).json({ msg: 'Bad username or password' })

    //Wrong password
    if (!bcrypt.compareSync(req.body.pswd, user.pswdHash))
        return res.status(401).json({ msg: 'Bad username or password' })

    console.log('Logged in, user: ' + req.body.name + ', IP: ' + req.ip)
    req.session.name = req.body.name
    if (user.elevated)
        req.session.elevated = true

    res.status(200).json({ msg: 'Logged in' })
})

router.delete('/', (req, res) => {
    console.log(`Logged an user out: ${req.session.name}, IP: ${req.ip}`)
    req.session.destroy((err) => console.error(err))
    res.clearCookie('sprciacho')
    res.status(200).json({ msg: 'Logged out' })
})

module.exports = router