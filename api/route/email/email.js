const nodemailer = require('nodemailer');
const moment = require('moment')
const range = require('./range')

//Send Alert Email
module.exports = async function sendEmail(periodId,sensortype,value,email){
    const alert = await checkValue(sensortype,value)
    if(!alert) return false
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    await transporter.verify().then().catch(console.error);
    
    await transporter.sendMail({
        from: process.env.EMAIL, // sender address
        to: email, // list of receivers
        subject: `${moment().format('MMMM Do YYYY')} : Alert Email`, // Subject line
        text: "", // plain text body
        html: `<br/><p>This is an alert email<p/><b><p>PeriodId : ${periodId}</p><p>Sensortype : ${sensortype}</p><p>Value : ${value}</p></b>`, // html body
      }).then(info => {
        console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Sent an alert email`)
        return true;
      }).catch((err)=> {return false});
}

async function checkValue(sensortype,value) {
  const sensorRange = await range(sensortype)
  //return true IF Value < lower range OR Value > higher range 
  if(sensorRange) {
    if(value < sensorRange.down || value > sensorRange.up){
      return true
    }  
  }
  return false
}