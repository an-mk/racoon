const express = require('express')
const helmet = require('helmet')
const app = express()
const mongo = require('mongodb')
const mongoClient = mongo.MongoClient

const port = process.env.SPRPORT
const dbspswd = process.env.MONGOPSW
const dbhost = process.env.MONGOHOST

const mongourl =  "mongodb+srv://dbUser:"+dbspswd+"@"+dbhost+"/sprawdzarka?retryWrites=true&w=majority";
const client = new mongoClient(mongourl, { useNewUrlParser: true, useUnifiedTopology: true })

const session = require('express-session')
const cryptoRandomString = require('crypto-random-string')
const cookieSecret = cryptoRandomString({length: 10})

app.use(session({
	name: "sprciacho",
	secret: cookieSecret,
	resave: false,
	saveUninitialized: false,
	cookie: { sameSite: true }
}))
app.use('/public',express.static('public'))
app.use(express.json())
app.use(helmet())
app.disable('x-powered-by')

function jsonInputGuardian (obj, strict = false)
{	
	for(var prop in obj)
	{
		if(!(typeof obj[prop] == 'string')){
			return false
		}
		if(strict === true && !obj[prop].length) return false
	}
	return true
}

client.connect( function(err, db) {
	try
	{
		if (err) throw err
		console.log("DB connection established!")
		
		app.locals.db = db
		dbo = db.db("sprawdzarka")
		dbo.createCollection("users", (err, res)=>{
			if(err) throw err
			console.log("Prepared collection for users")
			console.log("Db connection is now open")
			//db.close()
		})
	}
	catch(e)
	{
		console.log("Failed to connect to db: \n"+e.message)
		process.exit(1)
	}
	finally
	{
		//client.close()
	}
})

app.get('/', (req, res) => res.sendFile(__dirname + 'public/index.html') )
app.get('/me', (req, res) => res.status(200).send('IT WORKZ!'))
app.get('/imilogged', (req, res)=>{
	if(req.session.name === undefined)res.send("nay")
	else res.send("ye")
})
app.get('/imiadmin', (req, res)=>{
	if(req.session.elevated === undefined)res.send("nay")
	else res.send("ye")
})

app.get('/usrs/get/:name', (req, res) => {
	res.send('! '+req.params.name)
})
app.post('/usrs/create/', (req, res)=> {
	var pld = req.body
	console.log("Received request to create new user. Payload: "+ pld)
	if(!jsonInputGuardian(pld)){
		console.log("Malformed user creation request. IP: " + req.ip)
		res.status(400).json({'msg':'error'})
		return 
	}
	if(pld.pswd == "" || pld.name == ""){
		console.log("Empty name or password. Rejecting. IP: "+ req.ip)
		res.status(400).json({'msg':'empty field'})
		return
	}
	
	try
	{
		var dbo = app.locals.db.db("sprawdzarka")
		dbo.collection("users").findOne({name : pld.name}, (err, result) => {
			if(err)throw err
			else if(!(result === null)){
				console.log("Tried to create user with already taken username. IP: "+ req.ip)
				res.status(409).json({'msg':'username is taken'})
				return
			}else{
				console.log("Inserting a new user: "+pld.name+", coming from IP: " + req.ip)
				dbo.collection("users").insertOne(pld)
				res.status(201).json({'msg':'success'})
				return
			}
		})
	}
	catch(e)
	{
		console.log("Failed to create a new user: \n"+e.message)
		res.status(500)
		return
	}
	finally
	{
		
	}
	

})

app.post('/login/', (req, res)=>{
	var pld = req.body
	if(!jsonInputGuardian(pld, true)){
		console.log("Malformed login request. IP: " + req.ip)
		res.status(400).json({'msg':'error'})
		return 
	}
	var dbo = app.locals.db.db("sprawdzarka")
	
	dbo.collection("users").findOne({name : pld.name, pswd : pld.pswd}, (err, resl) =>{
		if(err){
			console.log("Error while processing request: " + err)
			res.status(500).json({'msg':'error'})
			return
		}else if(resl === null){
			console.log("Login failed with username: "+ pld.name + ",IP:" + req.ip)
			res.status(401).json({'msg' : 'bad username or password'})
			return
		}else{
			console.log("Logged in, user: " + resl.name + ",IP: " + req.ip)
			req.session.name = resl.name
			req.session.elevated = resl.elevated
			res.status(200).json({'msg' : 'logged-in'})
			return
		}
	})
})

app.delete('/logout/', (req, res)=>{
	var pld = req.body
	if(!jsonInputGuardian(pld, true)){
		console.log("Malformed login request. IP: " + req.ip)
		res.status(400).json({'msg':'error'})
		return 
	}
	var dbo = app.locals.db.db("sprawdzarka")
	req.session.destroy( (err)=> {
	
	})
	console.log("Logged an user out: " + pld.name + ", IP:", req.ip)
	res.clearCookie('sprciacho')
	res.status(200).json({'msg':'logged-out'})
	
})

app.listen(port, () => console.log(`Uruchomione, na porcie ${port}`) )