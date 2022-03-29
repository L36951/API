const router = require('express').Router()
const Record = require('../model/Record')
const moment = require('moment')
require('dotenv').config()

const { verifyTokenAndAuthorization,verifyTokenAndAdmin } = require('./verifyToken')

//CREATE
router.post('/',verifyTokenAndAdmin,async (req,res)=>{
    const newRecord = new Record(req.body)
    try{
        const savedRecord = await newRecord.save()
        if(!savedRecord) return res.status(400).json({ok:0,msg:`record created unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : record ${savedRecord.record}'s data created`);
        res.status(201).json({ok:1,msg:`${savedRecord.record}'s data created`})
    }catch(err){
        res.status(500).json(err)
    }
})

//UPDATE BY OBJECT ID
router.put('/:id',verifyTokenAndAdmin,async (req,res)=>{
    try{
        const updatedRecord = await Record.findByIdAndUpdate(
            req.params.id,
            {
            $set : req.body
            },
            { new: true}
        )
        if(!updatedRecord) return res.status(400).json({ok:0,msg:`record updated unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : record ${updatedRecord.record}'s data updated`);
        res.status(200).json({ok:1,msg:`${updatedRecord.record}'s data updated`})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET RECORDS (FOR INTERNAL USER)
router.get('/query',verifyTokenAndAuthorization,async(req,res)=>{
    try{
        let records,queryStatus
        //QUERY BY RECORD NAME
        if(req.query.record){
            records = await Record.find({record: req.query.record},{'_id':0,'updatedAt':0,'createdAt':0,'__v':0})
            queryStatus = req.query.record
        }
        //QUERY ALL
        else{
            records = await Record.find({},{'_id':0,'updatedAt':0,'createdAt':0,'__v':0})
            queryStatus = 'all'
        }
   
        if(records.length < 1) return res.status(400).json({ok:0,msg:`record queried unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : record query ${queryStatus} records by Internal User`);
        res.status(200).json({ok:1,data:records})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET RECORD (FOR ADMIN)
router.get("/admin/query",verifyTokenAndAdmin,async(req,res)=>{
    try{
        let records,queryStatus
        //QUERY BY RECORD NAME
        if(req.query.record){
            records = await Record.find({record:req.query.record})
            queryStatus = req.query.record
        }
        //QUERY BY OBJECT ID
        else if(req.query._id){
            records = await Record.find({_id:req.query._id})
            queryStatus = req.query._id
        }
        //QUERY ALL
        else{
            records = await Record.find({})
            queryStatus = 'all'
        }

        if(records.length < 1) return res.status(400).json({ok:0,msg:`record queried unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : record query ${queryStatus} data by admin`)
        res.status(200).json({ok:1,data:records})
    }catch(err){
        res.status(500).json(err)
    }
})

//DELETE BY OBJECT ID
router.delete('/:id',verifyTokenAndAdmin,async(req,res)=>{
    try{
        const deletedRecord = await Record.findByIdAndDelete(req.params.id);
        if(!deletedRecord) return res.status(400).json({ok:0,msg:`${req.params.id} record deleted unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : record ${deletedRecord.record} has been deleted.`);
        res.status(200).json({ok:1,msg:`Record has been deleted...`})
    }catch(err){
        res.status(500).json(err)
    }
})

module.exports = router