const mongoose = require('mongoose')

const sensortypeSchema = new mongoose.Schema(
    {
        sensortype:{ type: String , required:true, unique: true},
        sensorname:{ type: String , require:true}
    },
    {timestamps : true}
)

module.exports = mongoose.model("Sensortype",sensortypeSchema)