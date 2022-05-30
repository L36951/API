const mongoose = require('mongoose')

const sensortypeSchema = new mongoose.Schema(
    {
        sensortype:{ type: String , required:true, unique: true},
        abbreviation:{ type: String , require:true},
        unit:{ type: String , require:true}
    },
    {timestamps : true}
)

module.exports = mongoose.model("Sensortype",sensortypeSchema)