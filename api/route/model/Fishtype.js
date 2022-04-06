const mongoose = require('mongoose')

const fishtypeSchema = new mongoose.Schema(
    {
        fishtype:{ type: String , required:true, unique: true}
    },
    {timestamps : true}
)

module.exports = mongoose.model("Fishtype",fishtypeSchema)