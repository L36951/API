const mongoose = require('mongoose')

const fishpondSchema = new mongoose.Schema(
    {
        fishpondId:{ type: String , required:true, unique: true},
        location: { type: String, required: true },
        length: { type: Number, required: true},
        height: { type: Number, required: true},
        width: { type: Number, required: true},
    },
    {timestamps : true}
)

module.exports = mongoose.model("Fishpond",fishpondSchema)