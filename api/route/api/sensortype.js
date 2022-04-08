const router = require('express').Router()
const Sensortype = require('../model/Sensortype')
const moment = require('moment')
require('dotenv').config()

const { verifyTokenAndAuthorization,verifyTokenAndAdmin } = require('./verifyToken')

//CREATE
router.post('/',verifyTokenAndAdmin,async (req,res)=>{
    const newSensortype = new Sensortype(req.body)
    try{
        const savedSensortype = await newSensortype.save()
        if(!savedSensortype) return res.status(400).json({ok:0,msg:`sensortype created unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Sensortype ${savedSensortype.sensortype}'s data created`);
        res.status(201).json({ok:1,msg:`${savedSensortype.sensortype}'s data created`})
    }catch(err){
        res.status(500).json(err)
    }
})

//UPDATE BY OBJECT ID
router.put('/:id',verifyTokenAndAdmin,async (req,res)=>{
    try{
        const updatedSensortype = await Sensortype.findByIdAndUpdate(
            req.params.id,
            {
            $set : req.body
            },
            { new: true}
        )
        if(!updatedSensortype) return res.status(400).json({ok:0,msg:`sensortype updated unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Sensortype ${updatedSensortype.sensortype}'s data updated`);
        res.status(200).json({ok:1,msg:`${updatedSensortype.sensortype}'s data updated`})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET SENSORTYPES (FOR INTERNAL USER)
router.get('/query',verifyTokenAndAuthorization,async(req,res)=>{
    try{
        let sensortypes, queryStatus
        //QUERY BY SENSORTYPE 
        if(req.query.sensortype){
            sensortypes = await Sensortype.find({sensortype: req.query.sensortype},{'_id':0,'updatedAt':0,'createdAt':0,'__v':0})
            queryStatus = req.query.sensortype
        }
        //QUERY BY SENSORNAME
        else if(req.query.sensorname){
            sensortypes = await Sensortype.find({sensorname:req.query.sensorname},{'_id':0,'updatedAt':0,'createdAt':0,'__v':0})
            queryStatus = req.query.sensorname
        }
        //QUERY ALL
        else{
            sensortypes = await Sensortype.find({},{'_id':0,'updatedAt':0,'createdAt':0,'__v':0})     
            queryStatus = 'all'
        }

        if(sensortypes.length < 1) return res.status(400).json({ok:0,msg:`sensortype queried unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : sensortype query ${queryStatus} sensortypes by Internal User`);
        res.status(200).json({ok:1,data:sensortypes})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET SENSORTYPE (FOR ADMIN)
router.get("/admin/query",verifyTokenAndAdmin,async(req,res)=>{
    try{
        let sensortypes,queryStatus
        //QUERY BY SENSORTYPE
        if(req.query.sensortype){
            sensortypes = await Sensortype.find({sensortype:req.query.sensortype})
            queryStatus = req.query.sensortype
        }
        //QUERY BY SENSORNAME
        else if(req.query.sensorname){
            sensortypes = await Sensortype.find({sensorname:req.query.sensorname})
            queryStatus = req.query.sensorname
        }
        //QUERY BY OBJECTID
        else if(req.query._id){
            sensortypes = await Sensortype.find({_id:req.query._id})
            queryStatus = req.query._id
        }
        //QUERY ALL
        else {
            sensortypes = await Sensortype.find({})
            queryStatus = 'all'
        }
        
        if(sensortypes.length < 1) return res.status(400).json({ok:0,msg:`sensortype queried unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : sensortype query ${queryStatus} data by admin`)
        res.status(200).json({ok:1,data:sensortypes})
    }catch(err){
        res.status(500).json(err)
    }
})

//DELETE BY OBJECT ID
router.delete('/:id',verifyTokenAndAdmin,async(req,res)=>{
    try{
        const deletedSensortype = await Sensortype.findByIdAndDelete(req.params.id);
        if(!deletedSensortype) return res.status(400).json({ok:0,msg:`${req.params.id} sensortype deleted unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : sensortype ${deletedSensortype.sensortype} has been deleted.`);
        res.status(200).json({ok:1,msg:`sensortype has been deleted...`})
    }catch(err){
        res.status(500).json(err)
    }
})

module.exports = router