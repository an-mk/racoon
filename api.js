const User = require('./User')
const router = require('express').Router()
const { check, validationResult } = require('express-validator')
const bcrypt = require('bcrypt')

router.get('/', (_req, res) => res.sendFile(`${__dirname}public/index.html`))

router.get('/imilogged', (req, res) => {
    if (req.session.name === undefined) res.send('nay')
    else res.send('ye')
})

router.get('/imiadmin', (req, res) => {
    if (req.session.elevated === undefined) res.send('nay')
    else res.send('ye')
})

router.post('/users/create/', [
    check('name').isString().trim().escape().not().isEmpty(),
    check('pswd').isString().not().isEmpty()
],  (req, res) => {
    console.log(`Received request to create new user. Name: ${req.body.name}, password: ${req.body.pswd[0]}...`)
    /*if (!jsonInputGuardian(pld)) {
        console.log('Malformed user creation request. IP: ' + req.ip)
        res.status(400).json({ msg: 'error' })
        return
    }
    if (pld.pswd == '' || pld.name == '') {
        console.log('Empty name or password. Rejecting. IP: ' + req.ip)
        res.status(400).json({ msg: 'empty field' })
        return
    }

    try {
        var dbo = router.locals.db.db('sprawdzarka')
        dbo.collection('users').findOne({ name: pld.name }, (err, result) => {
            if (err) throw err
            else if (!(result === null)) {
                console.log('Tried to create user with already taken username. IP: ' + req.ip)
                res.status(409).json({ msg: 'username is taken' })
                return
            } else {
                console.log('Inserting a new user: ' + pld.name + ', coming from IP: ' + req.ip)
                dbo.collection('users').insertOne(pld)
                res.status(201).json({ msg: 'success' })
                return
            }
        })

    }
    catch (e) {
        console.log('Failed to create a new user: \n' + e.message)
        res.status(500)
        return
    }*/
    const user = new User({ name: req.body.name , pswdHash: bcrypt.hashSync(req.body.pswd, 10) });
    user.save((err) => {
        if (err) {
            console.error(err)
            res.sendStatus(500)
            return
        }
        res.sendStatus(201)
    });
})

router.post('/login/', [
    check('name').isString().not().isEmpty(),
    check('pswd').isString().not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    const user = await User.findOne({ name: req.body.name });

    //User does not exist
    if (!user)
        return res.status(401).json({ msg: 'Bad username or password' })

    //Wrong password
    if (!bcrypt.compareSync(req.body.pswd, user.pswdHash))
        return res.status(401).json({ msg: 'Bad username or password' })

    console.log('Logged in, user: ' + req.body.name + ', IP: ' + req.ip)
    req.session.name = req.body.name
    req.session.elevated = req.body.elevated
    res.status(200).json({ msg: 'Logged in' })
})

router.delete('/logout/', (req, res) => {
	/*var pld = req.body
	if (!jsonInputGuardian(pld, true)) {
		console.log('Malformed login request. IP: ' + req.ip)
		res.status(400).json({ msg: 'error' })
		return
	}*/
    req.session.destroy((err) => console.error(err))

    console.log(`Logged an user out: ${req.body.name}, IP: ${req.ip}`)
    res.clearCookie('sprciacho')
    res.status(200).json({ msg: 'Logged out' })
})

module.exports = router