const mongoose = require('mongoose')
const Schema = mongoose.Schema

const periodSchema = new mongoose.Schema(
    {
        periodId:{ type: String , required:true, unique: true},
        fishpond:{ type: Schema.Types.ObjectId, ref: 'Fishpond' ,required: true},
        fishtype: { type: Schema.Types.ObjectId, ref: 'Fishtype' ,required: true},
        start_quantity: { type: Number, min: 1 , max: 5000 ,required: true},
        end_quantity: { type: Number, min: 1 , max: 5000 },
        start_Date : { type: Date , require: true},
        isEnd: { type: Boolean, default: false},
        end_Date : {type : Date},
        alert_email: { type: String, required: true}
    },
    {timestamps : true}
)

module.exports = mongoose.model("Period",periodSchema)