const User = require('../models/User')
const router = require('express').Router()
const { check, validationResult } = require('express-validator')
const bcrypt = require('bcrypt')

router.get('/amilogged', (req, res) => {
    if (req.session.name === undefined) res.send('nay')
    else res.send('ye')
})

router.get('/myname', (req, res) => {
    if (req.session.name) res.send(req.session.name)
    else res.sendStatus(404)
})

router.get('/amiadmin', (req, res) => {
    if (req.session.elevated === undefined) res.send('nay')
    else res.send('ye')
})

router.post('/users/create', [
    check('name').isString().trim().escape().not().isEmpty(),
    check('pswd').isString().not().isEmpty()
], async (req, res) => {
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

router.post('/login', [
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
    if(user.elevated)
        req.session.elevated = true

    res.status(200).json({ msg: 'Logged in' })
})

router.delete('/logout', (req, res) => {
    console.log(`Logged an user out: ${req.session.name}, IP: ${req.ip}`)
    req.session.destroy((err) => console.error(err))
    res.clearCookie('sprciacho')
    res.status(200).json({ msg: 'Logged out' })
})

module.exports = router