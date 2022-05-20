const router = require('express').Router()
const Fishpond = require('../model/Fishpond')
const Period = require('../model/Period')
const Sensorrecord = require('../model/Sensorrecord')
const moment = require('moment')
require('dotenv').config()

const { verifyTokenAndAdmin } = require('./verifyToken')

//CREATE
router.post('/',verifyTokenAndAdmin,async (req,res)=>{
    let newFishpondId = 'FP-'
    //find the maximum number of fishpond id
    const latestFishpond = await Fishpond.find({}).sort({_id:-1}).limit(1)
    if(latestFishpond.length < 1) newFishpondId += '001'
    else{
        //Increase 1 of fishpondID
        let newnumber = Number(latestFishpond[0].fishpondId.slice(3)) + 1
        if (newnumber < 10) newFishpondId += '00' + newnumber
        else if(newnumber < 100) newFishpondId += '0' + newnumber
        else newFishpondId += newnumber
    }
    
    req.body.fishpondId = newFishpondId

    //CREATE
    const newFishpond = new Fishpond(req.body)
    try{
        const savedFishpond = await newFishpond.save()
        if(!savedFishpond) return res.status(400).json({ok:0,msg:`fishpond created unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : fishpond ${savedFishpond.fishpondId}'s data created`);
        res.status(201).json({ok:1,msg:`fishpond ${savedFishpond.fishpondId}'s data created`})
    }catch(err){
        res.status(500).json(err)
    }
})

//UPDATE
router.put('/:id',verifyTokenAndAdmin,async (req,res)=>{
    //REJECT UPDATE WITH FISHPOND ID IN req.body
    if(req.body.fishpondId) return res.status(400).json({ok:0,msg:`fishpond must not be changed`})
    try{
        const filter = {}
        //UPDATE BY FISHPOND ID
        if(req.params.id.startsWith('FP-')){
            filter.fishpondId = req.params.id
        }
        //UPDATE BY OBJECT ID
        else{
            filter._id = req.params.id
        }
        const updatedFishpond = await Fishpond.findOneAndUpdate(
            filter,
            {
            $set : req.body
            },
            { new: true}
        )
        if(!updatedFishpond) return res.status(400).json({ok:0,msg:`No this fishpond.`})
    
        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : fishpond ${updatedFishpond.fishpondId}'s data updated by ${req.params.id}`);
        return res.status(200).json({ok:1,msg:`fishpond ${updatedFishpond.fishpondId}'s data updated`})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET FISHPONDS (FOR PUBLIC)
router.get('/query',async(req,res)=>{
    try{
        const filter = {}
        let fishponds ,queryStatus = '';
        //QUERY LATEST 5 FISHPOND
        if(req.query.new){       
            queryStatus += 'the latest 5' 
            //QUERY BY LOCATION
            if(req.query.location){
                filter.location = req.query.location
                queryStatus += ` ${req.query.location}`
            }
            fishponds = await Fishpond.find(filter,{'_id':0,'createdAt':0,'__v':0}).sort({_id:-1}).limit(5) 
        }  
        //QUERY BY FISHPONDID
        else if(req.query.fishpondid){
            fishponds = await Fishpond.find({fishpondId : req.query.fishpondid},{'_id':0,'createdAt':0,'__v':0})
            queryStatus += ` ${req.query.fishpondid}`
        }
        else{     
            //QUERY BY LOCATION
            if(req.query.location){
                filter.location = req.query.location
                queryStatus += ` ${req.query.location}`
            }
            fishponds = await Fishpond.find(filter,{'_id':0,'createdAt':0,'__v':0})
            queryStatus = !queryStatus ? ' all' : queryStatus
        }
        
        if(fishponds.length < 1) return res.status(400).json({ok:0,msg:`No fishpond queried.`})
        
        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : fishpond query${queryStatus} fishponds by Public`);
        res.status(200).json({ok:1,data:fishponds})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET FISHPOND (FOR ADMIN)
router.get("/admin/query",verifyTokenAndAdmin,async(req,res)=>{
    try{
        let fishponds,queryStatus ='';
        //FIND FISNPOND CREATED NUMBER IN THIS YEAR EACH MONTH
        if(req.query.stats){
            const date = new Date()
            const lastYear = new Date(date.setFullYear(date.getFullYear() - 1))
            const data = await Fishpond.aggregate([
                { $match : { createdAt : { $gte: lastYear } } },
                {
                    $project: {
                        month: { $month: "$createdAt" }
                    }
                },
                {
                    $group:{
                        _id: "$month",
                        total : {$sum : 1}
                    }
                }
            ])
            if(data.length < 1) return res.status(400).json({ok:0,msg:`fishpond aggregated unsuccessfully.`})
            fishponds = data
            queryStatus = ` ${lastYear.getFullYear() + 1}`
        }
        //QUERY LATEST 5 FISHPOND
        else if(req.query.new){       
            const filter = {}
            queryStatus += 'the latest 5' 
            //QUERY BY LOCATION
            if(req.query.location){
                filter.location = req.query.location
                queryStatus += ` ${req.query.location}`
            }
            fishponds = await Fishpond.find(filter,{'_id':0,'createdAt':0,'__v':0}).sort({_id:-1}).limit(5) 
        }  
        //QUERY BY OBJECT ID
        else if(req.query._id){
            fishponds = await Fishpond.find({_id : req.query._id})    
            queryStatus = ` ${req.query._id}`
        }
        //QUERY BY FISHPONDID
        else if(req.query.fishpondid){
            fishponds = await Fishpond.find({fishpondId : req.query.fishpondid})
            queryStatus += ` ${req.query.fishpondid}`
        }
        else{
            const filter = {}
            //QUERY BY LOCATION
            if(req.query.location){
                filter.location = req.query.location
                queryStatus += ` ${req.query.location}`
            }
            fishponds = await Fishpond.find(filter)
            queryStatus = !queryStatus ? ' all' : queryStatus
        }

        if(fishponds.length < 1) return res.status(400).json({ok:0,msg:`No this fishpond.`})
        
        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : fishpond query${queryStatus}'s data by admin`)
        res.status(200).json({ok:1,data:fishponds})
    }catch(err){
        res.status(500).json(err)
    }
})

//DELETE
router.delete('/:id',verifyTokenAndAdmin,async(req,res)=>{
    try{
        const filter = {}
        let fishpond_id , fishpondid
        //DELETE BY FISHPOND ID
        if(req.params.id.startsWith('FP-')){
            const findFishObjectId = await Fishpond.findOne({fishpondId : req.params.id})
            if(!findFishObjectId) return res.status(400).json({ok:0,msg:`No this fishpond.`})
            fishpond_id = findFishObjectId._id
            filter.fishpondId = fishpondid = req.params.id
        }
        //DELETE BY OBJECT ID
        else {
            const findFishpondId = await Fishpond.findOne({_id : req.params.id})
            if(!findFishpondId) return res.status(400).json({ok:0,msg:`No this fishpond.`})
            filter._id = fishpond_id = req.params.id
            fishpondid = findFishpondId.fishpondId
        }    
        //FIND ANY PERIOD STILL RUNNING
        const periods = await Period.find({fishpond : fishpond_id}).sort({_id:-1})
        if(periods.length > 0){
            if(!periods[0].isEnd) return res.status(400).json({ok:0,msg:`fishpond period is still working.`})
            //Count deleted Sensorrecord
            let total = 0
            for(let i=0;i<periods.length;i++){
                const deletedSensorrecord = await Sensorrecord.deleteMany({period:periods[i]._id})
                total += deletedSensorrecord.deletedCount
            }
            const deletedPeriod = await Period.deleteMany({fishpond: fishpond_id})
            console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Sesnorrecord ${total} row(s) has been deleted.`);
            console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Period ${deletedPeriod.deletedCount} row(s) has been deleted.`);
        }
  
        const deletedFishpond = await Fishpond.deleteOne(filter);
        if(!deletedFishpond) return res.status(400).json({ok:0,msg:`No this fishpond.`})
        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Fishpond ${fishpondid} has been deleted.`);  
        res.status(200).json({ok:1,msg:`Fishpond has been deleted...`})
    }catch(err){
        res.status(500).json(err)
    }
})

module.exports = router