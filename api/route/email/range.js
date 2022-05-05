module.exports = async function range (sensortype) {
    switch(sensortype){
      //pH值
      case 'pH value' : return { down:6.8 , up : 7.5 }
      //水溫
      case 'Water temperature' : return { down:20 , up : 28 }
      //溶解氧
      case 'Dissolved Oxygen' : return { down: 137.8, up :154.9 }
      //氧化還原電位 https://jcc7831036.pixnet.net/blog/post/30708394
      case 'Oxidation-reduction potential(ORP)' : return { down: 300, up:450 }
      //總溶解固體
      case 'Total Dissolved Solids' : return { down : 250 , up : 350 }
      //銨濃度
      case 'Ammonium concentration' : return { down:144.791,up:145.053 }
      //硝酸鹽濃度
      case 'Nitrates concentration' : return { down:143.62,up:144.21 }
      //葉綠素
      case 'Chlorophyll' : return { down:80,up:100 }
      //NOT MATCHED
      default : return null
    }
  }