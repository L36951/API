//import dependencies
const express = require('express');
const mongoose = require('mongoose')
const cors = require('cors');
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

//Server config
const app = express()
const port = process.env.port || 5000
const corsOptions ={
    origin:'http://localhost:3000', 
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200
}

app.use(express.urlencoded({extended:true}));
app.use(cors(corsOptions));

//Middleware
app.use(express.json())

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

//Start server
app.listen(port , async () =>{
    console.log(`Server is listening port ${port}...`);
})

//error catching
app.get('/*',(req,res)=>{
    res.status(404).json({msg:`Your URL is not provided in the server`})
    console.log('Caught error');
})

