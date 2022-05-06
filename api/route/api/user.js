const router = require('express').Router()
const User = require('../model/User')
const CryptoJS = require('crypto-js')
const moment = require('moment')
require('dotenv').config()

const { verifyTokenAndAdmin } = require('./verifyToken')

//UPDATE
router.put('/:id',verifyTokenAndAdmin,async (req,res)=>{
    if(req.body.password){
        req.body.password = CryptoJS.AES.encrypt(
            req.body.password,
            process.env.PASSWORD_SECRET)
            .toString()
    }
    try{
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            {
            $set : req.body
            },
            { new: true}
        )
        if(!updatedUser) return res.status(400).json({ok:0,msg:`user ${req.params.id} updated unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : User ${updatedUser.username}'s data updated`);
        res.status(200).json({ok:1,msg:`${updatedUser.username}'s data updated`})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET ALL USER
router.get('/',verifyTokenAndAdmin,async(req,res)=>{
    try{
        const users = req.query.new 
        ? await User.find().sort({_id:-1}).limit(5) 
        : await User.find()

        const queryStatus = req.query.new ? 'the latest 5' : 'all'
        if(users.length <1) return res.status(400).json({ok:0,msg:`${queryStatus} user queried unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : query ${queryStatus} users`);
        res.status(200).json({ok:1,data:users})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET USER
router.get('/stats',verifyTokenAndAdmin,async(req,res)=>{
    const date = new Date()
    const lastYear = new Date(date.setFullYear(date.getFullYear() - 1))
    try{
        const data = await User.aggregate([
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
        if(!data) return res.status(400).json({ok:0,msg:`user aggregated unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : query created users in ${new Date().getFullYear()}`);
        res.status(200).json({ok:1,data:data})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET USER
router.get("/query",verifyTokenAndAdmin,async(req,res)=>{
    try{
        const user = await User.find({_id : req.query._id})
        if(user.length < 1) return res.status(400).json({ok:0,msg:`user ${req.query.id} queried unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : User query ${user[0].username}'s data`);
        res.status(200).json({ok:1,data:user})
    }catch(err){
        console.log(err);
    }
})

//DELETE
router.delete('/:id',verifyTokenAndAdmin,async(req,res)=>{
    try{
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if(!deletedUser) return res.status(400).json({ok:0,msg:`user ${req.params.id} deleted unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : User ${deletedUser.username} has been deleted.`);
        res.status(200).json({ok:1,msg:`User has been deleted...`})
    }catch(err){
        res.status(500).json(err)
    }
})

module.exports = router