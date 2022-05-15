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

//CREATE
router.post('/group',verifyTokenAndAuthorization,async (req,res)=>{
    try{
        let column = [];
        for(let i=0;i<req.body.data.length;i++){
            const data = {};
            //FIND PERIOD
            const period = await Period.findOne({periodId : req.body.data[i].periodid})
            if(!period) continue
            else if(period.isEnd) continue
            data.period = period._id
            
            //FIND SENSORTYPE
            const sensortype = await Sensortype.findOne({sensortype : req.body.data[i].sensortype})
            if(!sensortype) continue
            //FIND RECORD
            //Send Alert Email if value out of range
            const sendAlertEmail = await sendEmail(period.periodId,sensortype.sensortype,req.body.data[i].value,period.alert_email)
            //if return true
            if(sendAlertEmail) req.body.data[i].record = "alert"

            const record = await Record.findOne({record : req.body.data[i].record})
            if(!record) continue

            data.record = record._id
            data.sensortype = sensortype._id
            data.value = req.body.data[i].value
            column.push(data)
        }
        if(column.length < 1) return res.status(400).json({ok:0,msg:`No data is valid.`})

        const savedSensorrecord = await Sensorrecord.insertMany(column);
        if(savedSensorrecord.length < 1) return res.status(400).json({ok:0,msg:`sensorrecord created unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Group of Sensorrecord(amount : ${req.body.data.length}) data created`);
        res.status(201).json({ok:1,msg:`Group of Sensorrecord data(amount : ${req.body.data.length}) created`})
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

function isInt(num){
    if (Number.isInteger(num)) {
        return true;
    }
    return false;
}

//GET SENSORRECORDS (FOR PUBLIC)
router.get('/query',async(req,res)=>{
    try{
        const filter = {}
        const lengthfilter = {}
        let sensorrecords,queryStatus = ''
        let length

        //QUERY BY RECORD , PERIOD ID , SENSORTYPE
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
            if(req.query.length){
                length = isInt(parseInt(req.query.length)) ? parseInt(req.query.length) : 1000
                lengthfilter.limit = length
            }
                sensorrecords = await Sensorrecord.find(filter,{'_id':0,'createdAt':0,'__v':0},lengthfilter)
                                                    .populate('sensortype','sensortype -_id')
                                                    .populate('record','record -_id')
                                                    .populate({
                                                        path : 'period',
                                                        select : 'periodId -_id',
                                                        populate: [
                                                            {path: 'fishpond',select : 'fishpondId -_id'},
                                                            {path: 'fishtype',select : 'fishtype -_id'}
                                                        ]
                                                    }).sort({_id:-1})

        if(sensorrecords.length < 1) return res.status(400).json({ok:0,msg:`No sensorrecord queried.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : record query ${sensorrecords.length} ${queryStatus}records by PUBLIC`);
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
        const lengthfilter = {}
        let length

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
        }else{
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
            if(req.query.length){
                length = isInt(parseInt(req.query.length)) ? parseInt(req.query.length) : 1000
                lengthfilter.limit = length
            }
            sensorrecords = await Sensorrecord.find(filter,{},lengthfilter)
                                                    .populate('sensortype')
                                                    .populate('record')
                                                    .populate({
                                                        path : 'period',
                                                        select : 'periodId -_id',
                                                        populate: [
                                                            {path: 'fishpond'},
                                                            {path: 'fishtype'}
                                                        ]
                                                    }).sort({_id:-1})
        }
        
            
        if(sensorrecords.length < 1) return res.status(400).json({ok:0,msg:`No sensorrecord queried.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : record query ${sensorrecords.length} ${queryStatus}records by Admin`);
        res.status(200).json({ok:1,data:sensorrecords})
    }catch(err){
        res.status(500).json(err)
    }
})

//Find every sensortype and quantity average of each period
router.get('/queryend/aver',verifyTokenAndAdmin,async(req,res)=>{
    //Find Ended periods
    const periods = await Period.find({isEnd : true},{'periodId':1,'start_quantity':1,'end_quantity':1})
    //Get all sensortype
    const sensortypes = await Sensortype.find({},{'sensortype':1,'abbreviation':1})

    const data = []
    //Loop every isEnd periods
    for(let i=0;i<periods.length;i++){ 
        const tempObj = {}
        tempObj.periodId = periods[i].periodId
        const tempArray = []
        //Loop every sensortype
        for(let k=0;k<sensortypes.length;k++){
            const tempData = {}
            
            //Group by period and sensortype and cal average
            const singledata = await Sensorrecord.aggregate([
                { $match : { period : periods[i]._id , sensortype : sensortypes[k]._id} },
                {
                    $group:{
                        _id: "$period",
                        value: { $avg: "$value" }
                    }
                }
            ])
            //If no data , go to next sensortype
            if(singledata.length < 1) continue

            // tempData.sensortype = sensortypes[k].sensortype
            // tempData.value = singledata[0].value

            var abbreviation = sensortypes[k].abbreviation
            tempData[abbreviation] = singledata[0].value

            tempArray.push(tempData)
        }   
        //push start and end quantity in temp array
        tempArray.push({'start_quantity' : periods[i].start_quantity})
        tempArray.push({'end_quantity' : periods[i].end_quantity})

        tempObj.data = tempArray
        data.push(tempObj)      
    }
    if(data.length < 1) return res.status(400).json({ok:0,msg:`period aggregated unsuccessfully.`})
    res.status(200).json({ok:1,data:data})
    console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Find all sensortype and quantity average.`);
})

router.get('/admin/daydata',async(req,res)=>{
    const period_id = await getPeriodObjectId(req.query.periodid)
    if(!period_id) return res.status(400).json({ok:0,msg:"No this period"})
    const sensortype_id = await getSensortypeObjectId(req.query.sensortype)
    if (!sensortype_id) return res.status(400).json({ok:0,msg:"No this sensortype"})
    const data = await Sensorrecord.aggregate([
        { 
            $match : { 
                period : period_id , 
                sensortype : sensortype_id
            } 
        },
        {
            $group:{
                _id: { 
                    $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                },
                min : {$min : "$value"},
                max : {$max : "$value"},
                open : {$first : "$value"},
                close : {$last : "$value"}
            }
        },
        { $sort: { _id: 1 } },
    ])
    if(data.length < 1) return res.status(400).json({ok:0,msg:`No sensorrecord to aggregate`})
    
    console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : query everyday min , max , first , last sensorrecord data by admin`)
    res.status(200).json({ok:1,data:data})
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