
const router = require('express').Router()
const User = require('../model/User')
const CryptoJS = require('crypto-js')
const jwt = require('jsonwebtoken')
const moment = require('moment');
const multer = require('multer');
const fs = require('fs');
const request = require('request')
const { verifyTokenAndAuthorization,verifyTokenAndAdmin } = require('../api/verifyToken');
const Record = require('../model/Record')
const Period = require('../model/Period')
const Sensorrecord = require('../model/Sensorrecord')
const Sensortype = require('../model/Sensortype')
const storage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null,'uploads');
    },
    filename:(req,file,cb)=>{
        cb(null, Date.now() + file.originalname);
    }
})
const upload = multer({storage:storage});



require('dotenv').config()
var image;
//REGISTER
router.post('/objectDetection', upload.single('image'), async (req, res) => {
    // if(!req.body.img) return res.status(400).json(`please provide img`)
    let count=0;
    var result;
    const options = {
        method: "POST",
        url: "https://southcentralus.api.cognitive.microsoft.com/customvision/v3.0/Prediction/7faa12ea-9c7e-401b-a647-ce91ca0e1f59/detect/iterations/Iteration1/image",
        
        headers: {
            'Prediction-Key': "b5c4edb356354588849494d754aea32a",
            "Content-Type": "multipart/form-data"
        },
        formData : {
            "image" : fs.createReadStream(req.file.path)
        }
    };
    
    request(options, async (err, res, body) =>{
        if(err) console.log(err);
        result = JSON.parse(body)
        result.predictions.map((d,i)=>{if(d.probability>0.3)count+=1})
        try{
            //FIND PERIOD
            const period = await Period.findOne({periodId : req.body.periodid})
           // if(!period) return res.status(400).json({ok:0,msg:'period not exist'})
            //else if(period.isEnd) return res.status(400).json({ok:0,msg:'period had been END'})
            //FIND RECORD
            const record = await Record.findOne({record : req.body.record})
            //if(!record) return res.status(400).json({ok:0,msg:'record not exist'})
            //FIND SENSORTYPE
            const sensortype = await Sensortype.findOne({sensortype : "Camera"})
            //if(!sensortype) return res.status(400).json({ok:0,msg:'sensortype not exist'})
    
            req.body.period = period._id
            req.body.record = record._id
            req.body.sensortype = sensortype._id
            req.body.value = count;
            const newSensorrecord = new Sensorrecord(req.body)
    
            const savedSensorrecord = await newSensorrecord.save()
            //if(!savedSensorrecord) return res.status(400).json({ok:0,msg:`sensorrecord created unsuccessfully.`})
    
            //Send Alert Email if value out of range
            // if(sendEmail(period.periodId,sensortype.sensortype,req.body.value))
            //     console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Sent an alert email`)
    
            console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Sensorrecord (${sensortype.sensortype} : ${req.body.value}) data created in ${period.periodId}`);
            //res.status(201).json({ok:1,msg:`Sensorrecord(${sensortype.sensortype} : ${req.body.value}) data created in ${period.periodId}`})
        }catch(err){
            //res.status(500).json(err)
            console.log(err)
        }
    });
    fs.unlinkSync(req.file.path);
    
    console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Object Detected`);
    return res.status(201).json({ok:1,msg:`Sensorrecord created `})
  

})



module.exports = router