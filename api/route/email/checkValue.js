const range = require('./range')

module.exports = async function checkValue(sensortype,value) {
    const sensorRange = await range(sensortype)
    //return true IF Value < lower range OR Value > higher range 
    if(sensorRange) {
      if(value < sensorRange.down || value > sensorRange.up){
        return true
      }  
    }
    return false
  }