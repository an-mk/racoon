const User = require('../models/User')
const router = require('express').Router()
const { check, validationResult } = require('express-validator')
const bcrypt = require('bcrypt')

router.post('/create', [
    check('name').isString().trim().escape().not().isEmpty(),
    check('pswd').isString().not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    console.log(`Received request to create new user. Name: ${req.body.name}, password: ${req.body.pswd[0]}...`)

    const oldUser = await User.findOne({ name: req.body.name });

    //User does already exist
    if (oldUser)
        return res.status(409).json({ msg: 'Bad username or password' })

    const user = new User({ name: req.body.name, pswdHash: bcrypt.hashSync(req.body.pswd, 10), elevated: false });
    user.save((err) => {
        if (err) {
            console.error(err)
            res.sendStatus(500)
            return
        }
        //req.session.name = req.body.name
        //req.session.elevated = req.body.elevated <-- Naruszenie bezpieczeństwa, wtf, niech sam się loguje
        res.sendStatus(201)
    });
})

module.exports = router