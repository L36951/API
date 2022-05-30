
const router = require('express').Router()
const User = require('../model/User')
const CryptoJS = require('crypto-js')
const jwt = require('jsonwebtoken')
const moment = require('moment');
const multer = require('multer');
const fs = require('fs');
const request = require('request')
const { verifyTokenAndAuthorization, verifyTokenAndAdmin } = require('../api/verifyToken');
const Record = require('../model/Record')
const Period = require('../model/Period')
const Sensorrecord = require('../model/Sensorrecord')
const Sensortype = require('../model/Sensortype')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + file.originalname);
    }
})
const upload = multer({ storage: storage });


const fileType=["image/png","image/jpeg","image/gif","image/bmp"]
require('dotenv').config()
var image;
//REGISTER
router.post('/objectDetection', upload.single('image'), async (req, res) => {
    // if(!req.body.img) return res.status(400).json(`please provide img`)
    
    if(!fileType.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
         return res.status(400).json({ok:0,msg:"Unknown file type"})
        }
    let count = 0;
    var result;
    const options = {
        method: "POST",
        url: process.env.OJECT_DETECTION_URL,

        headers: {
            'Prediction-Key': process.env.OJECT_DETECTION_KEY,
            "Content-Type": "multipart/form-data"
        },
        formData: {
            "image": fs.createReadStream(req.file.path)
        }
    };

    const response = request(options, async (err, res, body) => {
       

        result = JSON.parse(body)
        result.predictions.map((d, i) => { if (d.probability > 0.3) count += 1 })
        try {
            //FIND PERIOD
            const period = await Period.findOne({ periodId: req.body.periodid })
            if (!period) return false;
            // if(!period) return res.status(400).json({ok:0,msg:'period not exist'})
            //else if(period.isEnd) return res.status(400).json({ok:0,msg:'period had been END'})
            //FIND RECORD
            const record = await Record.findOne({ record: req.body.record })
            if (!record) return false;
            //if(!record) return res.status(400).json({ok:0,msg:'record not exist'})
            //FIND SENSORTYPE
            const sensortype = await Sensortype.findOne({ sensortype: "Camera" })
            if (!sensortype) return false;
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
            fs.unlinkSync(req.file.path);

            console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Sensorrecord (${sensortype.sensortype} : ${req.body.value}) data created in ${period.periodId}`);
            //res.status(201).json({ok:1,msg:`Sensorrecord(${sensortype.sensortype} : ${req.body.value}) data created in ${period.periodId}`})

        } catch (err) {
            //res.status(500).json(err)
            console.log(err)
        }
    });

    response.on('error',function(resp){
        return res.status(400).json({ok:0,msg:"Unknown"})
    })
    response.on('response', function (resp) {
        return res.status(201).json({ ok: 1, msg: `Sensorrecord created ` })
    })

})



module.exports = router