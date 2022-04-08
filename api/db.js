const mongoose = require('mongoose')

module.exports = async function connection(){
    try{
        await mongoose.connect(process.env.MONGO_URL)
        console.log('DB connect Successfully!');
    }catch(err){
        console.log(err);
    }
}