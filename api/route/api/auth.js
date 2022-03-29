const router = require('express').Router()
const User = require('../model/User')
const CryptoJS = require('crypto-js')
const jwt = require('jsonwebtoken')
const moment = require('moment')
const { setToken , refreshToken , checkToken , checkTokenById } = require('../tokenlist')
const { verifyToken } = require('./verifyToken')
require('dotenv').config()

//REGISTER
router.post('/register', async (req,res)=>{
    if(!req.body.password) return res.status(400).json({ok:0,msg:`please provide password value`})
    if(req.body.password.length < 6) return res.status(400).json({ok:0,msg:`password length should be 6 or more`})
    const newUser = new User({
        username: req.body.username,
        email: req.body.email,
        password: CryptoJS.AES.encrypt(
            req.body.password,
            process.env.PASSWORD_SECRET)
            .toString()
    })

    try{
        const savedUser = await newUser.save()
        if(!savedUser) return res.status(400).json({ok:0,msg:`${req.body.username} created unsuccessfully.`})

        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Created a new user ${savedUser.username}`);
        res.status(201).json({ok: 1,msg:`User ${savedUser.username} created`});
    }catch(err){
        res.status(500).json(err);
    }
})

const genAccessToken = (user) =>{
    return jwt.sign(
        {
            id: user.id,
            isAdmin: user.isAdmin
        },
        process.env.JWT_SECRET,
        {expiresIn:process.env.JWT_EXPIRES_IN}
    )
}

const genRefreshToken = (user) =>{
    return jwt.sign(
        {
            id: user.id,
            isAdmin: user.isAdmin
        },
        process.env.JWT_REFRESH_SECRET,
        {expiresIn:process.env.JWT_EXPIRES_IN}
    )
}

//LOGIN
router.post('/login', async (req,res)=>{
    try{
        let user;
        //Login with username
        if(req.body.username){
            user = await User.findOne({username: req.body.username})
        }

        //Login with email
        else if(req.body.email){
            user = await User.findOne({email: req.body.email})
        }
        
        if(!user) return res.status(401).json({ok:0,msg:"Wrong credentials!"})

        const hashedPassword = CryptoJS.AES.decrypt(
            user.password,
            process.env.PASSWORD_SECRET
        )
        
        const Originalpassword = hashedPassword.toString(CryptoJS.enc.Utf8)
        if(Originalpassword !== req.body.password) return res.status(401).json({ok:0,msg:'Wrong credentials!'})        
        
        user.id = user._id 

        checkTokenById(user.id)

        const accessToken = genAccessToken(user)
        const refreshToken = genRefreshToken(user)
        
        setToken(refreshToken)

        res.status(201).cookie('refreshToken',refreshToken,{
            sameSite : 'lax',
            path : '/',
            expires: new Date(new Date().getTime() + 60*60*24*7 * 1000),
            httpOnly : true,
            secure: true
        }).json({ok: 1,token:accessToken});   
        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : ${user.username} get the access token`);
    }catch(err){
        console.log(err)
    }
})

//Logout
router.get('/deletecookie', async (req,res)=>{
    const Token = await req.cookies.refreshToken
    if(!refreshToken(Token)) return res.status(400).json({ok:0,msg:`No refresh cookies`})
    res.status(202).clearCookie('refreshToken').json({ok:1,msg:`cookies cleared`})
})

//check token
router.post('/check',verifyToken,async (req,res)=>{
    const user = await User.findById(req.user.id)
    if(!user) return res.status(403).json({ok:0,msg:'Token is not valid!'}) 
    req.user = null
    console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : ${user.username} check the access token`);
    return res.status(201).json({ok:1,msg:`${user.username}'s token is still valid`})
})

//refresh
router.get('/refresh',async(req,res)=>{
    try{
        const Token = await req.cookies.refreshToken
        //send error if there is no token
        if(!Token) return res.status(401).json({ok:0,msg:`You are not authenticated!`})
        if(!checkToken(Token)) return res.status(403).json({ok:0,msg:' refreshToken is not valid!'})
        jwt.verify(Token,process.env.JWT_REFRESH_SECRET,(err,user)=>{
            if(err) return res.status(403).json({ok:0,msg:err})
            const newAccessToken = genAccessToken(user)
            // const newRefreshToken = genRefreshToken(user)

            // setToken(newRefreshToken)

            // res.status(201).cookie('refreshToken',newRefreshToken,{
            //     sameSite : 'lax',
            //     path : '/',
            //     expires: new Date(new Date().getTime() + 60*60*24*7 * 1000),
            //     httpOnly : true,
            //     secure: true
            // }).json({ok: 1,newToken:newAccessToken});

            res.status(201).json({ok: 1,newToken:newAccessToken});
            console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : user ${user.id} refresh token`);
        })

    }catch(err){
        console.log(err)
    }
})

module.exports = router