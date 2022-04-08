const jwt = require('jsonwebtoken')
const User = require('../model/User')

const verifyToken = async (req,res,next)=>{;
    const authHeader = req.headers.token
    if(authHeader){
        const token = authHeader.split(" ")[0]
        jwt.verify( token , process.env.JWT_SECRET,(err,user)=>{
            if(err) return res.status(403).json({ok:0,msg:'Token is not valid!'})
            req.user = user
            next()
        })
    }
    else{
        return res.status(401).json({ok:0,msg:'You are not authenticated!'})
    }
}

const verifyTokenAndAuthorization = async (req,res,next)=>{
    verifyToken(req,res,async ()=>{
        if(req.user.isAdmin){
            req.user = null
            next()
        }
        else if(req.user.id){           
            const user = await User.findById(req.user.id)
            if(!user) return res.status(401).json({ok:0,msg:'You are not authenticated!'})
            req.user = null
            next()
        }
        else{
            res.status(403).json({ok:0,msg:'You are not allowed to do that'})
        }
    })
}

const verifyTokenAndAdmin = async (req,res,next)=>{
    verifyToken(req,res,()=>{
        if(req.user.isAdmin){ 
            req.user = null
            next()
        }
        else{
            res.status(403).json({ok:0,msg:'You are not allowed to do that'})
        }
    })
}

module.exports = { verifyToken , verifyTokenAndAdmin , verifyTokenAndAuthorization }