const nodemailer = require('nodemailer');
const moment = require('moment')
const Sensortype = require('../model/Sensortype')

module.exports = async function sendEmail(periodId,sensortype,value){
    if(!checkValue(sensortype,value)) return false
    // const transporter = nodemailer.createTransport({
    //     host: 'smtp.gmail.com',
    //     port: 587,
    //     auth: {
    //       user: process.env.EMAIL,
    //       pass: process.env.EMAIL_PASSWORD,
    //     },
    //   });
    //   await transporter.verify().then().catch(console.error);
      
    //   await transporter.sendMail({
    //       from: process.env.EMAIL, // sender address
    //       to: process.env.EMAIL, // list of receivers
    //       subject: `${moment().format('MMMM Do YYYY')} : Alert Email`, // Subject line
    //       text: "", // plain text body
    //       html: `<br/><p>This is an alert email<p/><b><p>PeriodId : ${periodId}</p><p>Sensortype : ${sensortype}</p><p>Value : ${value}</p></b>`, // html body
    //     }).then(info => {
          return true;
    //     }).catch((err)=> {return false});
}

const checkValue = async (sensortype,value) =>{
  const sensortypes = await Sensortype.find({},{'_id':0,'sensortype':1})
  for(let i=0;i<sensortypes.length;i++){
    if(sensortypes[i].sensortype == sensortype){
      const sensorRange = range(sensortypes[i].sensortype)
      if(!sensorRange) return true
    }
  }
  return false
}

const range = (sensortype) =>{
  switch(sensortype){
    //pH值
    case 'pH value' : return { low:6.8 , high : 7.5}
    //水溫
    case 'Water temperature' : return { low:20 , high : 28 }
    //硝酸鹽
    case 'Nitrates concentration' : return { low:0 , high : 50}
    //DO
    case 'Dissolved Oxygen' : return {}
    //
    case 'Oxidation-reduction potential(ORP)' : return {}
    //
    case 'Total Dissolved Solids' : return {}
    //
    case 'Ammonium concentration' : return {}
    //
    case 'Nitrates concentration' : return {}
    //
    case 'Chlorophyll' : return {}
    default : return null
  }
}