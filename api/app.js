//import dependencies
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
var http = require('http');
var https = require('https');
var fs = require('fs');
require('dotenv').config()

//import db connection
const connection = require('./db')

//import API Route
const authRoute = require('./route/api/auth')
const userRoute = require('./route/api/user')
const fishpondRoute = require('./route/api/fishpond')
const fishtypeRoute = require('./route/api/fishtype')
const periodRoute = require('./route/api/period')
const recordRoute = require('./route/api/record')
const sensortypeRoute = require('./route/api/sensortype')
const sensorrecordRoute = require('./route/api/sensorrecord')
const dataAnalysis = require('./route/ai/dataAnalysis');
const objectDetection = require('./route/ai/objectDetection');
var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');

var credentials = {key: privateKey, cert: certificate};
//Server config
const app = express()
const port = process.env.PORT || 5000
const corsOptions ={
    origin: process.env.COR_ORIGIN, 
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200
}

//Middleware
app.use(express.json())
app.use(express.urlencoded({extended:true}));
app.use(cors(corsOptions));
app.use(cookieParser())

//Connect to db
connection()

//API
app.use('/api/auth',authRoute)
app.use('/api/user',userRoute)
app.use('/api/fishpond',fishpondRoute)
app.use('/api/fishtype',fishtypeRoute)
app.use('/api/period',periodRoute)
app.use('/api/record',recordRoute)
app.use('/api/sensortype',sensortypeRoute)
app.use('/api/sensorrecord',sensorrecordRoute)
app.use('/api/objectDetection',objectDetection);
app.use('/api/dataAnalysis',dataAnalysis);
//Start server
/*
app.listen(port , async () =>{
    console.log(`Server is listening port ${port}...`);
})
*/
//var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);
//httpServer.listen(port);
httpsServer.listen(port);
//error catching
app.get('/*',(req,res)=>{
    res.status(404).json({ok:0,msg:`Your URL is not provided in the server`})
    console.log('Caught error');
})