//import dependencies
const express = require('express');
const mongoose = require('mongoose')
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config()

//import db connection
const connection = require('./db')

//import email
const sendEmail = require('./route/email/email')

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
//Server config
const app = express()
const port = process.env.PORT || 5000
const corsOptions ={
    origin:'http://localhost:3000', 
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200
}

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors(corsOptions));
app.use(cookieParser())

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
app.use('/api/objectDetection',objectDetection);
app.use('/api/dataAnalysis',dataAnalysis)

//Start server
app.listen(port , async () =>{
    console.log(`Server is listening port ${port}...`);
})

//error catching
app.get('/123/123',(req,res)=>{
    res.cookie('user', 123, { httpOnly: true, path: '/' })
  
      res.send("Hello.");
    console.log(req.cookies);
})

//error catching
app.get('/*',(req,res)=>{
    res.status(404).json({ok:0,msg:`Your URL is not provided in the server`})
    console.log('Caught error');
})

// app.post('/email/send',(req,res)=>{
//     if(sendEmail()) return res.status(200).json({ok:1,msg:`Alert email has been sent`})
//     res.status(400).json({ok:0,msg:`Alert email has not been sent`})
// })
// const accountSid = 'ACc9e501ea673a166f362565891b115475'; 
// const authToken = 'e5c85183fe020e9fb7ec326acca0adfe'; 
// const client = require('twilio')(accountSid, authToken); 
 
// client.messages 
//       .create({ 
//          body: '收野啦',  
//          messagingServiceSid: 'MG474bf3e5883a4e0c162367cbb7692815',      
//          to: '+85293000176' 
//        }) 
//       .then(message => console.log(message.sid)) 
//       .done();