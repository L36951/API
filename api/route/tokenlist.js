const jwt = require('jsonwebtoken')

let tokenlist = []

//Store user token
const setToken = (token) =>{
    tokenlist.push(token)
}

//Filter out user token
const refreshToken = (token) =>{
    if(checkToken(token)){
        tokenlist = tokenlist.filter((currtoken) => currtoken !== token)
        return true
    }
    return false
}

//Check user token exist or not
const checkToken = (token) =>{
    if(tokenlist.includes(token)) return true
    return false
}

//Check user token by user id and filter its
const checkTokenById = (id) =>{
    tokenlist.map((currtoken) => {
        jwt.verify(currtoken,process.env.JWT_REFRESH_SECRET,(err,curruser) => {
            if(curruser.id == id) tokenlist = tokenlist.filter((token) => token !== currtoken)     
        })
    })
}

module.exports = { setToken , refreshToken ,checkToken , checkTokenById }