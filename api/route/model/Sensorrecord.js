const mongoose = require('mongoose')
const { Schema } = mongoose

const sensorrecordSchema = new mongoose.Schema(
    {
        period: { type: Schema.Types.ObjectId, required: true , ref:'Period' },
        record: { type: Schema.Types.ObjectId, required: true , ref: 'Record'},
        sensortype: { type: Schema.Types.ObjectId, required: true , ref: 'Sensortype'},
        value: { type: Number, required: true},
    },
    {timestamps : true}
)

module.exports = mongoose.model("Sensorrecord",sensorrecordSchema)