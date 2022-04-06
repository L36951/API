const router = require('express').Router()
const Fishtype = require('../model/Fishtype')
const moment = require('moment')
require('dotenv').config()

const { verifyTokenAndAdmin } = require('./verifyToken')

//CREATE
router.post('/',verifyTokenAndAdmin,async (req,res)=>{
    const newFishtype = new Fishtype(req.body)
    try{
        const savedFishtype = await newFishtype.save()
        if(!savedFishtype) return res.status(400).json({ok:0,msg:`Fishtype created unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : fishtype ${savedFishtype.fishtype}'s data created`);
        res.status(201).json({ok:1,msg:`${savedFishtype.fishtype}'s data created`})
    }catch(err){
        res.status(500).json(err)
    }
})

//UPDATE BY OBJECT ID
router.put('/:id',verifyTokenAndAdmin,async (req,res)=>{
    try{
        const updatedFishtype = await Fishtype.findByIdAndUpdate(
            req.params.id,
            {
            $set : req.body
            },
            { new: true}
        )
        if(!updatedFishtype) return res.status(400).json({ok:0,msg:`Fishtype updated unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : fishtype ${updatedFishtype.fishtype}'s data updated`);
        res.status(200).json({ok:1,msg:`${updatedFishtype.fishtype}'s data updated`})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET FISHTYPES (FOR PUBLIC)
router.get('/query',async(req,res)=>{
    try{
        let fishtypes,queryStatus;
        //QUERY BY FISHTYPE NAME
        if(req.query.fishtype){
            fishtypes = await Fishtype.find({fishtype: req.query.fishtype},{'_id':0,'createdAt':0,'__v':0})
            queryStatus = req.query.fishtype
        }
        //QUERY ALL
        else {
            fishtypes = await Fishtype.find({},{'_id':0,'createdAt':0,'__v':0})
            queryStatus = 'all'
        }  

        if(fishtypes.length < 1) return res.status(400).json({ok:0,msg:`No fishtype queried.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : fishtype query ${queryStatus} fishtypes by Public`);
        res.status(200).json({ok:1,data:fishtypes})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET FISHTYPE (FOR ADMIN)
router.get("/admin/query",verifyTokenAndAdmin,async(req,res)=>{
    try{
        let fishtypes,queryStatus;
        //QUERY BY FISHTYPE
        if(req.query.fishtype){
            fishtypes = await Fishtype.find({fishtype: req.query.fishtype})
            queryStatus = req.query.fishtype
        }
        //QUERY BY OBJECT ID
        else if(req.query._id){
            fishtypes = await Fishtype.find({_id:req.query._id}) 
            querystatus = req.query._id
        }
        //QUERY ALL
        else {
            fishtypes = await Fishtype.find({})
            queryStatus = 'all'
        }  

        if(fishtypes.length < 1) return res.status(400).json({ok:0,msg:`No fishtype queried.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : fishtype query ${queryStatus}'s data by admin`)
        res.status(200).json({ok:1,data:fishtypes})
    }catch(err){
        res.status(500).json(err)
    }
})

//DELETE BY OBJECT ID
router.delete('/:id',verifyTokenAndAdmin,async(req,res)=>{
    try{
        const deletedFishtype = await Fishtype.findByIdAndDelete(req.params.id);
        if(!deletedFishtype) return res.status(400).json({ok:0,msg:`No this Fishtype.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : fishtype ${deletedFishtype.fishtype} has been deleted.`);
        res.status(200).json({ok:1,msg:`Fishtype has been deleted...`})
    }catch(err){
        res.status(500).json(err)
    }
})

module.exports = router