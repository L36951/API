const mongoose = require('mongoose')

const recordSchema = new mongoose.Schema(
    {
        record:{ type: String , required:true, unique: true}
    },
    {timestamps : true}
)

module.exports = mongoose.model("Record",recordSchema)