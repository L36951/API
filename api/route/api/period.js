const router = require('express').Router()
const Period = require('../model/Period')
const Fishpond = require('../model/Fishpond')
const Fishtype = require('../model/Fishtype')
const Sensorrecord = require('../model/Sensorrecord')
const moment = require('moment')
require('dotenv').config()

const { verifyTokenAndAdmin } = require('./verifyToken')

//CREATE
router.post('/',verifyTokenAndAdmin,async (req,res)=>{
    //Find Fishpond
    const latestFishpond = await Fishpond.findOne({fishpondId : req.body.fishpondId})
    if(!latestFishpond) return res.status(400).json({ok:0,msg:'fishpond not exist'})

    //Find Fishtype
    const latestFishtype = await Fishtype.findOne({fishtype : req.body.fishtype})
    if(!latestFishtype) return res.status(400).json({ok:0,msg:'fishtype not exist'})

    //AutoIncrease 1 or create 001 for first period
    let newperiodId;
    newperiodId = latestFishpond._doc.fishpondId + '-'
    const latestPeriod = await Period.find({fishpond : latestFishpond._doc._id}).sort({_id:-1}).limit(1)

    if(latestPeriod.length < 1) newperiodId += '001'
    else{
        //Find the latest period
        const max = await Period.findOne({periodId : latestPeriod[0].periodId},{'_id':0,'createdAt':0,'__v':0})
        //isEnd == false >> not allow creating
        if(!max._doc.isEnd) return res.status(400).json({ok:0,msg:'the latest period is still working'})
        //Increase 1 of periodId
        let newnumber = Number(latestPeriod[0].periodId.slice(7)) + 1
        if (newnumber < 10) newperiodId += '00' + newnumber
        else if(newnumber < 100) newperiodId += '0' + newnumber
        else newPeriodId += newnumber
    }

    req.body.periodId = newperiodId
    req.body.fishpond = latestFishpond._doc._id
    req.body.fishtype = latestFishtype._doc._id

    const newPeriod = new Period(req.body)
    try{
        const savedPeriod = await newPeriod.save()
        if(!savedPeriod) return res.status(401).json({ok:0,msg:`period created unsuccessfully.`})
        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : period ${savedPeriod.periodId}'s data created`);
        res.status(201).json({ok:1,msg:`period ${savedPeriod.periodId}'s data created`})
    }catch(err){
        res.status(500).json(err)
    }
})

//UPDATE BY ID
router.put('/:id',verifyTokenAndAdmin,async (req,res)=>{
    try{
        const filter = {}
        //UPDATE BY PERIOD ID
        let period = await Period.findOne({periodId : req.params.id})
        if(period) filter.periodId = req.params.id
        //UPDATE BY OBJECT ID
        else{
            period = await Period.findById(req.params.id)
            //NEITHER
            if(!period) return res.status(400).json({ok:0,msg:`period not exist.`})
            else filter._id = req.params.id
        }
        //RETURN IF THIS PERIOD WAS FINISHED
        if(period._doc.isEnd) return res.status(400).json({ok:0,msg:'This period had already finished'})
        //FIND FISHTYPE
        if(req.body.fishtype){
            const fishtype = await Fishtype.findOne({fishtype: req.body.fishtype})
            if(!fishtype) return res.status(400).json({ok:0,msg:`fishtype not exist.`})
            
            req.body.fishtype = fishtype._doc._id
        } 
        //FIND FISHPOND AND CHANGE PERIOD ID
        if(req.body.fishpondid){
            const fishpond = await Fishpond.findOne({fishpondId : req.body.fishpondid})
            //No result return from db
            if(!fishpond) return res.status(400).json({ok:0,msg:'No this fishpond'})
            const max = await Period.find({fishpond: fishpond._id}).sort({_id:-1}).limit(1)
            //isEnd == false >> not allow creating
            let newPeriodId = req.body.fishpondid + '-' 
            if(max.length < 1) newPeriodId += '001'
            else if(!max[0].isEnd) return res.status(400).json({ok:0,msg:'the latest period is still working'})
            //Change number of periodId
            else{
                let newnumber = Number(max[0].periodId.slice(7)) + 1
                if (newnumber < 10) newPeriodId += '00' + newnumber
                else if(newnumber < 100) newPeriodId += '0' + newnumber
                else newPeriodId += newnumber
            }
            req.body.periodId = newPeriodId
            req.body.fishpond = fishpond._id
        }
        //If isEnd or end_quantity
        if(req.body.isEnd || req.body.end_quantity){
            //ADD END_DATE IF PERIOD HAS BEEN FINISHED
            if(req.body.isEnd && req.body.end_quantity) req.body.end_Date = new Date()
            //return if either one is not included
            else return res.status(400).json({ok:0,msg:`please provide isEnd and end_quantity value`}) 
        }
        
        const updatedPeriod = await Period.updateOne(
            filter,
            {
            $set : req.body
            }
        )
        if(updatedPeriod.modifiedCount < 1) return res.status(400).json({ok:0,msg:`period updated unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : period ${period.periodId}'s data updated`);
        res.status(200).json({ok:1,msg:`period ${period.periodId}'s data updated`})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET PERIODS (FOR PUBLIC)
router.get('/query',async (req,res)=>{
    try{
        const filter = {}
        let periods,queryStatus = '';
        
        //QUERY BY THE LATEST 5 PERIODID
        if(req.query.new){
            queryStatus = 'the latest 5'
            //QUERY BY MAX PERIOD ID
            if(req.query.max){
                const maxfilter = {}
                //GROUP BY 
                periods = await Period.aggregate([
                    {$group:{_id: "$fishpond",periodId : {$max : "$periodId"}}}
                ])

                //IF DB RETURN NOTHING
                if(periods.length < 1) return res.status(400).json({ok:0,msg:`max periodid queried unsuccessfully.`})

                //GET REQUIRED DATA BY MAX PERIOD ID filter.periodId = ['FP-001-001','FP-001-002']
                let maxperiod = []
                for (let i=0;i<periods.length;i++) {         
                    maxperiod.push(periods[i].periodId)
                }
                queryStatus += ' max'
                filter.periodId = maxperiod
            }
            //QUERY END ED PERIOD
            if(req.query.isEnd){
                filter.isEnd = true
                if(req.query.fishpondid){
                    const fishpond = await Fishpond.findOne({fishpondId : req.query.fishpondid},{'_id':1})
                    if(!fishpond) return res.status(400).json({ok:0,msg:'fishpond not exist'})
                    filter.fishpond = fishpond._id;
                }
                queryStatus += ' isEnd'
            }
            //QUERY BY FISHPONDID
            if(req.query.fishpondid){
                const fishpond = await Fishpond.findOne({fishpondId : req.query.fishpondid},{'_id':1})
                if(!fishpond) return res.status(400).json({ok:0,msg:'fishpond not exist'})
                filter.fishpond = fishpond._id
                queryStatus += ` ${req.query.fishpondid}`
            }
            //QUERY BY FISHTYPE
            if(req.query.fishtype){
                const fishtype = await Fishtype.findOne({fishtype : req.query.fishtype},{'_id':1})
                if(!fishtype) return res.status(400).json({ok:0,msg:'fishtype not exist'})
                filter.fishtype = fishtype._id
                queryStatus += ` ${req.query.fishtype}`
            }
            periods = await Period.find(filter,{'_id':0,'createdAt':0,'__v':0,'alert_email':0})
                                    .populate('fishpond',{fishpondId : 1 ,_id : 0})
                                    .populate('fishtype',{fishtype : 1 ,_id : 0})
                                    .sort({_id:-1}).limit(5)  
        }
        //QUERY BY PERIOD ID
        else if(req.query.periodid){
            periods = await Period.find({periodId: req.query.periodid},{'_id':0,'createdAt':0,'__v':0,'alert_email':0})
                                .populate('fishpond',{fishpondId : 1 ,_id : 0})
                                .populate('fishtype',{fishtype : 1 ,_id : 0})
            queryStatus += ` ${req.query.periodid}`
        }
        else{
            //QUERY BY MAX PERIOD ID
            if(req.query.max){
                //GROUP BY 
                periods = await Period.aggregate([
                    {$group:{_id: "$fishpond",periodId : {$max : "$periodId"}}}
                ])

                //IF DB RETURN NOTHING
                if(periods.length < 1) return res.status(400).json({ok:0,msg:`max periodid queried unsuccessfully.`})

                //GET REQUIRED DATA BY MAX PERIOD ID filter.periodId = ['FP-001-001','FP-001-002']
                let maxperiod = []
                for (let i=0;i<periods.length;i++) {         
                    maxperiod.push(periods[i].periodId)
                }
                queryStatus = ' max'
                filter.periodId = maxperiod
            }
            //QUERY END ED PERIOD
            if(req.query.isEnd){
                filter.isEnd = true
                if(req.query.fishpondid){
                    const fishpond = await Fishpond.findOne({fishpondId : req.query.fishpondid},{'_id':1})
                    if(!fishpond) return res.status(400).json({ok:0,msg:'fishpond not exist'})
                    filter.fishpond = fishpond._id;
                }
                queryStatus += ' isEnd'
            }
            //QUERY BY FISHPONDID
            if(req.query.fishpondid){
                const fishpond = await Fishpond.findOne({fishpondId : req.query.fishpondid},{'_id':1})
                if(!fishpond) return res.status(400).json({ok:0,msg:'fishpond not exist'})
                filter.fishpond = fishpond._id
                queryStatus += ` ${req.query.fishpondid}`
            }
            //QUERY BY FISHTYPE
            if(req.query.fishtype){
                const fishtype = await Fishtype.findOne({fishtype : req.query.fishtype},{'_id':1})
                if(!fishtype) return res.status(400).json({ok:0,msg:'fishtype not exist'})
                filter.fishtype = fishtype._id
                queryStatus += ` ${req.query.fishtype}`
            }
            queryStatus = !queryStatus ? 'all' : queryStatus
            periods = await Period.find(filter,{'_id':0,'createdAt':0,'__v':0,'alert_email':0})
                      .populate('fishpond',{fishpondId : 1 ,_id : 0})  
                      .populate('fishtype',{fishtype : 1 ,_id : 0}) 
        }

        //IF DB RETURN NOTHING
        if(periods.length < 1) return res.status(400).json({ok:0,msg:`Nothing queried.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : period query ${queryStatus} Periods by Public`);
        res.status(200).json({ok:1,data:periods})
    }catch(err){
        res.status(500).json(err)
    }
})

//GET PERIOD (FOR ADMIN)
router.get("/admin/query",verifyTokenAndAdmin,async(req,res)=>{
    try{
        const filter = {}
        let periods,queryStatus = '';
        //FIND FISNPOND CREATED NUMBER IN THIS YEAR EACH MONTH
        if(req.query.stats){
            const date = new Date()
            const lastYear = new Date(date.setFullYear(date.getFullYear() - 1))
            const data = await Period.aggregate([
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
            if(data.length < 1) return res.status(400).json({ok:0,msg:`period aggregated unsuccessfully.`})
            periods = data
            queryStatus = ` ${lastYear.getFullYear() + 1}`
        }
        //QUERY BY THE LATEST 5 PERIODID
        else if(req.query.new){
            queryStatus = 'the latest 5'
             //QUERY BY MAX PERIOD ID
             if(req.query.max){
                //GROUP BY 
                periods = await Period.aggregate([
                    {$group:{_id: "$fishpond",periodId : {$max : "$periodId"}}}
                ])

                //IF DB RETURN NOTHING
                if(periods.length < 1) return res.status(400).json({ok:0,msg:`max periodid queried unsuccessfully.`})

                //GET REQUIRED DATA BY MAX PERIOD ID filter.periodId = ['FP-001-001','FP-001-002']
                let maxperiod = []
                for (let i=0;i<periods.length;i++) {         
                    maxperiod.push(periods[i].periodId)
                }
                queryStatus += ' max'
                filter.periodId = maxperiod
            }
            //QUERY END ED PERIOD
            if(req.query.isEnd){
                filter.isEnd = true
                if(req.query.fishpondid){
                    const fishpond = await Fishpond.findOne({fishpondId : req.query.fishpondid},{'_id':1})
                    if(!fishpond) return res.status(400).json({ok:0,msg:'fishpond not exist'})
                    filter.fishpond = fishpond._id;
                }
                queryStatus += ' isEnd'
            }
            //QUERY BY FISHPONDID
            if(req.query.fishpondid){
                const fishpond = await Fishpond.findOne({fishpondId : req.query.fishpondid},{'_id':1})
                if(!fishpond) return res.status(400).json({ok:0,msg:'fishpond not exist'})
                filter.fishpond = fishpond._id
                queryStatus += ` ${req.query.fishpondid}`
            }
            //QUERY BY FISHTYPE
            if(req.query.fishtype){
                const fishtype = await Fishtype.findOne({fishtype : req.query.fishtype},{'_id':1})
                if(!fishtype) return res.status(400).json({ok:0,msg:'fishtype not exist'})
                filter.fishtype = fishtype._id
                queryStatus += ` ${req.query.fishtype}`
            }
            periods = await Period.find(filter)
                                    .populate('fishpond')
                                    .populate('fishtype')
                                    .sort({_id:-1}).limit(5)  
        }
        //QUERY BY PERIOD ID
        else if(req.query.periodid){
            periods = await Period.find({periodId: req.query.periodid})
                                .populate('fishpond')
                                .populate('fishtype')
            queryStatus += ` ${req.query.periodid}`
        }
        //QUERY BY OBJECT ID
        else if(req.query._id){
            periods = await Period.find({_id:req.query._id})
                                   .populate('fishpond')
                                   .populate('fishtype')
            queryStatus = req.query._id
        }
        else{
            //QUERY BY MAX PERIOD ID
            if(req.query.max){
                const maxfilter = {}
                //GROUP BY 
                periods = await Period.aggregate([
                    {$group:{_id: "$fishpond",periodId : {$max : "$periodId"}}}
                ])

                //IF DB RETURN NOTHING
                if(periods.length < 1) return res.status(400).json({ok:0,msg:`max periodid queried unsuccessfully.`})

                //GET REQUIRED DATA BY MAX PERIOD ID filter.periodId = ['FP-001-001','FP-001-002']
                let maxperiod = []
                for (let i=0;i<periods.length;i++) {         
                    maxperiod.push(periods[i].periodId)
                }
                queryStatus = ' max'
                filter.periodId = maxperiod
            }
            //QUERY END ED PERIOD
            if(req.query.isEnd){
                filter.isEnd = true
                if(req.query.fishpondid){
                    const fishpond = await Fishpond.findOne({fishpondId : req.query.fishpondid},{'_id':1})
                    if(!fishpond) return res.status(400).json({ok:0,msg:'fishpond not exist'})
                    filter.fishpond = fishpond._id;
                }
                queryStatus += ' isEnd'
            }
            //QUERY BY FISHPONDID
            if(req.query.fishpondid){
                const fishpond = await Fishpond.findOne({fishpondId : req.query.fishpondid},{'_id':1})
                if(!fishpond) return res.status(400).json({ok:0,msg:'fishpond not exist'})
                filter.fishpond = fishpond._id
                queryStatus += ` ${req.query.fishpondid}`
            }
            //QUERY BY FISHTYPE
            if(req.query.fishtype){
                const fishtype = await Fishtype.findOne({fishtype : req.query.fishtype},{'_id':1})
                if(!fishtype) return res.status(400).json({ok:0,msg:'fishtype not exist'})
                filter.fishtype = fishtype._id
                queryStatus += ` ${req.query.fishtype}`
            }
            queryStatus = !queryStatus ? 'all' : queryStatus
            periods = await Period.find(filter)
                      .populate('fishpond')  
                      .populate('fishtype') 
        }
        //IF DB RETURN NOTHING
        if(periods.length < 1) return res.status(400).json({ok:0,msg:`Nothing queried.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : period query ${queryStatus}'s data by admin`)
        res.status(200).json({ok:1,data:periods})
    }catch(err){
        res.status(500).json(err)
    }
})

//DELETE
router.delete('/:id',verifyTokenAndAdmin,async(req,res)=>{
    try{
        const filter = {}
        let period_id , periodid 
        //DELETE BY PERIOD ID
        if(req.params.id.startsWith('FP-')){
            const period = await Period.findOne({periodId : req.params.id})
            if(!period) return res.status(400).json({ok:0,msg:`No this period`})
            if(!period.isEnd) return res.status(400).json({ok:0,msg:'the latest period is still working'})
            period_id = period._id
            filter.periodId = periodid = req.params.id
        }
        //DELETE BY OBJECT ID
        else{
            const period = await Period.findById(req.params.id)
            if(!period) return res.status(400).json({ok:0,msg:`No this period`})
            if(!period.isEnd) return res.status(400).json({ok:0,msg:'the latest period is still working'})
            filter._id =  period_id = req.params.id
            periodid = period.periodId
        }

        const deletedPeriod = await Period.deleteOne(filter)
        if(!deletedPeriod) return res.status(400).json({ok:0,msg:`No this period`})
        const deletedSensorrecord = await Sensorrecord.deleteMany({period:period_id})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Sesnorrecord ${deletedSensorrecord.deletedCount} row(s) has been deleted.`);
        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : period ${periodid} has been deleted.`);
        res.status(200).json({ok:1,msg:`period has been deleted...`})
    }catch(err){
        res.status(500).json(err)
    }
})

module.exports = router