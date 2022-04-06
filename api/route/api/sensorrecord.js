const router = require('express').Router()
const Record = require('../model/Record')
const Period = require('../model/Period')
const Sensorrecord = require('../model/Sensorrecord')
const Sensortype = require('../model/Sensortype')
const moment = require('moment')
const sendEmail = require('../email/email')
require('dotenv').config()

const { verifyTokenAndAuthorization,verifyTokenAndAdmin } = require('./verifyToken')

//CREATE
router.post('/',verifyTokenAndAuthorization,async (req,res)=>{
    try{
        //FIND PERIOD
        const period = await Period.findOne({periodId : req.body.periodid})
        if(!period) return res.status(400).json({ok:0,msg:'period not exist'})
        else if(period.isEnd) return res.status(400).json({ok:0,msg:'period had been END'})
        //FIND RECORD
        const record = await Record.findOne({record : req.body.record})
        if(!record) return res.status(400).json({ok:0,msg:'record not exist'})
        //FIND SENSORTYPE
        const sensortype = await Sensortype.findOne({sensortype : req.body.sensortype})
        if(!sensortype) return res.status(400).json({ok:0,msg:'sensortype not exist'})

        req.body.period = period._id
        req.body.record = record._id
        req.body.sensortype = sensortype._id

        const newSensorrecord = new Sensorrecord(req.body)

        const savedSensorrecord = await newSensorrecord.save()
        if(!savedSensorrecord) return res.status(400).json({ok:0,msg:`sensorrecord created unsuccessfully.`})

        //Send Alert Email if value out of range
        const sendAlertEmail = await sendEmail(period.periodId,sensortype.sensortype,req.body.value,period.alert_email)
        
        //if return true
        if(sendAlertEmail){   
            const alertRecord = await Record.findOne({record : "alert"})   
            await Sensorrecord.findByIdAndUpdate(
                savedSensorrecord._id,
                {
                $set : {record : alertRecord._id}
                },
                { new: true}
            )
        }

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Sensorrecord (${sensortype.sensortype} : ${req.body.value}) data created in ${period.periodId}`);
        res.status(201).json({ok:1,msg:`Sensorrecord(${sensortype.sensortype} : ${req.body.value}) data created in ${period.periodId}`})
    }catch(err){
        res.status(500).json(err)
    }
})

//UPDATE BY OBJECT ID
router.put('/:id',verifyTokenAndAuthorization,async (req,res)=>{
    //REJECT UPDATE WITH PERIOD in req.body
    if(req.body.period) return res.status(400).json({ok:0,msg:'period must not be changed'})
    try{
        //object id
        //FIND SENSORRECORD DATA
        const sensorrecord = await Sensorrecord.findById(req.params.id).populate('period')
        if(!sensorrecord) return res.status(400).json({ok:0,msg:'sensorrecord not exist'})
        //IF THAT RECORD IS NOT UPDATED BY MANUAL, RETURN
        const record = await Record.findById(sensorrecord.record)
        if(record.record !== 'manual') return res.status(401).json({ok:0,msg:'record should be manual'})
        
        //req.body
        //FIND SENSORTYPE
        if(req.body.sensortype){
            const sensortype = await Sensortype.findOne({sensortype: req.body.sensortype})
            if(!sensortype) return res.status(400).json({ok:0,msg:'sensortype not exist'})
            req.body.sensortype = sensortype._id
        }
        //FIND PERIOD
        if(req.body.periodid){
            const period = await Period.findOne({periodId: req.body.periodid})
            if(!period) return res.status(400).json({ok:0,msg:'period not exist'})
            req.body.period = period._id
        }
        //FIND RECORD
        if(req.body.record){
            const record = await Record.findOne({record: req.body.record})
            if(!record) return res.status(400).json({ok:0,msg:'record not exist'}) 
            req.body.record = record._id
        }

        const updatedSensorrecord = await Sensorrecord.findByIdAndUpdate(
            req.params.id,
            {
            $set : req.body
            },
            { new: true}
        )
        if(!updatedSensorrecord) return res.status(400).json({ok:0,msg:`record updated unsuccessfully.`})
        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Sensorrecord ${sensorrecord.period.periodId}'s data updated by Internal User`);
        res.status(200).json({ok:0,msg:`${sensorrecord.period.periodId}'s data updated`})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET SENSORRECORDS (FOR PUBLIC)
router.get('/query',async(req,res)=>{
    try{
        const filter = {}
        let sensorrecords,queryStatus = ''
        //QUERY BY RECORD , PERIOD ID , SENSORTYPE
        if(req.query.new){
            queryStatus = 'the latest 5 '
            if(req.query.record){
                filter.record = await getRecordObjectId(req.query.record)
                if(!filter.record) return res.status(400).json({ok:0,msg:'record not exist'})
                queryStatus += `${req.query.record} `
            }
            //QUERY BY PERIOD ID
            if(req.query.periodid){
                filter.period = await getPeriodObjectId(req.query.periodid)
                if(!filter.period) return res.status(400).json({ok:0,msg:'period not exist'})
                queryStatus += `${req.query.periodid} `
            }
            //QUERY BY SENSORTYPE
            if(req.query.sensortype){
                filter.sensortype = await getSensortypeObjectId(req.query.sensortype)
                if(!filter.sensortype) return res.status(400).json({ok:0,msg:'sensortype not exist'})
                queryStatus += `${req.query.sensortype} `
            }
            sensorrecords = await Sensorrecord.find(filter,{'_id':0,'createdAt':0,'__v':0})
                                                    .populate('sensortype','sensortype -_id')
                                                    .populate('record','record -_id')
                                                    .populate({
                                                        path : 'period',
                                                        select : 'periodId -_id',
                                                        populate: [
                                                            {path: 'fishpond',select : 'fishpondId -_id'},
                                                            {path: 'fishtype',select : 'fishtype -_id'}
                                                        ]
                                                    }).sort({_id:-1}).limit(5)
        }
        else{
            if(req.query.record){
                filter.record = await getRecordObjectId(req.query.record)
                if(!filter.record) return res.status(400).json({ok:0,msg:'record not exist'})
                queryStatus += `${req.query.record} `
            }
            //QUERY BY PERIOD ID
            if(req.query.periodid){
                filter.period = await getPeriodObjectId(req.query.periodid)
                if(!filter.period) return res.status(400).json({ok:0,msg:'period not exist'})
                queryStatus += `${req.query.periodid} `
            }
            //QUERY BY SENSORTYPE
            if(req.query.sensortype){
                filter.sensortype = await getSensortypeObjectId(req.query.sensortype)
                if(!filter.sensortype) return res.status(400).json({ok:0,msg:'sensortype not exist'})
                queryStatus += `${req.query.sensortype} `
            }
            //QUERY ALL
            queryStatus = !queryStatus ? 'all ' : queryStatus
            sensorrecords = await Sensorrecord.find(filter,{'_id':0,'createdAt':0,'__v':0})
                                                .populate('sensortype','sensortype -_id')
                                                .populate('record','record -_id')
                                                .populate({
                                                    path : 'period',
                                                    select : 'periodId -_id',
                                                    populate: [
                                                        {path: 'fishpond',select : 'fishpondId -_id'},
                                                        {path: 'fishtype',select : 'fishtype -_id'}
                                                    ]
                                                })
        }

        if(sensorrecords.length < 1) return res.status(400).json({ok:0,msg:`No sensorrecord queried.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : record query ${queryStatus}records by PUBLIC`);
        res.status(200).json({ok:1,data:sensorrecords})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET SENSORRRECORD (FOR ADMIN)
router.get("/admin/query",verifyTokenAndAdmin,async(req,res)=>{
    try{
        const filter = {}
        let sensorrecords,queryStatus = ''
        //QUERY BY RECORD , PERIOD ID , SENSORTYPE
        if(req.query._id){
            sensorrecords = await Sensorrecord.find({_id : req.query._id})
                                                    .populate('sensortype')
                                                    .populate('record')
                                                    .populate({
                                                        path : 'period',
                                                        select : 'periodId -_id',
                                                        populate: [
                                                            {path: 'fishpond'},
                                                            {path: 'fishtype'}
                                                        ]
                                                    })
            queryStatus = `object id ${req.query._id} `
        }
        else if(req.query.new){
            queryStatus = 'the latest 5 '
            //QUERY BY RECORD
            if(req.query.record){
                filter.record = await getRecordObjectId(req.query.record)
                if(!filter.record) return res.status(400).json({ok:0,msg:'record not exist'})
                queryStatus += `${req.query.record} `
            }
            //QUERY BY PERIOD ID
            if(req.query.periodid){
                filter.period = await getPeriodObjectId(req.query.periodid)
                if(!filter.period) return res.status(400).json({ok:0,msg:'period not exist'})
                queryStatus += `${req.query.periodid} `
            }
            //QUERY BY SENSORTYPE
            if(req.query.sensortype){
                filter.sensortype = await getSensortypeObjectId(req.query.sensortype)
                if(!filter.sensortype) return res.status(400).json({ok:0,msg:'sensortype not exist'})
                queryStatus += `${req.query.sensortype} `
            }
            sensorrecords = await Sensorrecord.find(filter)
                                                    .populate('sensortype')
                                                    .populate('record')
                                                    .populate({
                                                        path : 'period',
                                                        select : 'periodId -_id',
                                                        populate: [
                                                            {path: 'fishpond'},
                                                            {path: 'fishtype'}
                                                        ]
                                                    }).sort({_id:-1}).limit(5)
            
        }
        else{
            //QUERY BY RECORD
            if(req.query.record){
                filter.record = await getRecordObjectId(req.query.record)
                if(!filter.record) return res.status(400).json({ok:0,msg:'record not exist'})
                queryStatus += `${req.query.record} `
            }
            //QUERY BY PERIOD ID
            if(req.query.periodid){
                filter.period = await getPeriodObjectId(req.query.periodid)
                if(!filter.period) return res.status(400).json({ok:0,msg:'period not exist'})
                queryStatus += `${req.query.periodid} `
            }
            //QUERY BY SENSORTYPE
            if(req.query.sensortype){
                filter.sensortype = await getSensortypeObjectId(req.query.sensortype)
                if(!filter.sensortype) return res.status(400).json({ok:0,msg:'sensortype not exist'})
                queryStatus += `${req.query.sensortype} `
            }
            //QUERY ALL
            queryStatus = !queryStatus ? 'all ' : queryStatus
            sensorrecords = await Sensorrecord.find(filter)
                                                    .populate('sensortype')
                                                    .populate('record')
                                                    .populate({
                                                        path : 'period',
                                                        select : 'periodId -_id',
                                                        populate: [
                                                            {path: 'fishpond'},
                                                            {path: 'fishtype'}
                                                        ]
                                                    })
        }
        if(sensorrecords.length < 1) return res.status(400).json({ok:0,msg:`No sensorrecord queried.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : record query ${queryStatus}records by Admin`);
        res.status(200).json({ok:1,data:sensorrecords})
    }catch(err){
        res.status(500).json(err)
    }
})

//DELETE BY OBJECT ID
router.delete('/:id',verifyTokenAndAdmin,async(req,res)=>{
    try{
        const deletedSensorrecord = await Sensorrecord.findByIdAndDelete(req.params.id);
        if(!deletedSensorrecord) return res.status(400).json({ok:0,msg:`${req.params.id} Sensorrecord deleted unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Sensorrecord has been deleted.`);
        res.status(200).json({ok:1,msg:`Sensorrecord has been deleted...`})
    }catch(err){
        res.status(500).json(err)
    }
})

//RETURN RECORD OBEJCT ID
async function getRecordObjectId(record){
    const records = await Record.findOne({record : record})
    if(!records) return false
    return records._id
}

//RETURN PERIOD OBEJCT ID
async function getPeriodObjectId(periodid){
    const Periods = await Period.findOne({periodId : periodid})
    if(!Periods) return false
    return Periods._id
}

//RETURN SENSORTYPE OBEJCT ID
async function getSensortypeObjectId(sensortype){
    const Sensortypes = await Sensortype.findOne({sensortype : sensortype})
    if(!Sensortypes) return false
    return Sensortypes._id
}

module.exports = router