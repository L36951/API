const router = require('express').Router();
const { AccessApprovalClient } = require('@google-cloud/access-approval');
const aiplatform = require('@google-cloud/aiplatform');
const Period = require('../model/Period')
const Sensorrecord = require('../model/Sensorrecord')
const Sensortype = require('../model/Sensortype')
const request = require('request')
const moment = require('moment');
router.get('/aiplatform', async (req, res) => {

    const endpointId = process.env.DATA_ANALYSIS_ENDPOINT;
    const project = process.env.DATA_ANALYSIS_PROJECT;
    const location = process.env.DATA_ANALYSIS_LOCATION
    const { prediction } = aiplatform.protos.google.cloud.aiplatform.v1.schema.predict;

    // Imports the Google Cloud Prediction service client
    const { PredictionServiceClient } = aiplatform.v1;

    // Import the helper module for converting arbitrary protobuf.Value objects.
    const { helpers } = aiplatform;

    // Specifies the location of the api endpoint
    const clientOptions = {

        apiEndpoint: 'asia-east2-aiplatform.googleapis.com',
    };
    // Instantiates a client
    const predictionServiceClient = new PredictionServiceClient(clientOptions);

    // Find corresponding period
    const periods = await Period.find({ periodId: req.query.periodid }, { 'periodId': 1, 'start_quantity': 1 })

    if (periods.length == 0) return res.status(400).json({ ok: 0, msg: 'period not exist' })
    //Get all sensortype
    const sensortypes = await Sensortype.find({}, { 'sensortype': 1, 'abbreviation': 1 })

    const result = {};
    const objData = {};
    const data = []
    for (let i = 0; i < periods.length; i++) {
        const tempObj = {}
        const tempArray = []
        //Loop every sensortype
        for (let k = 0; k < sensortypes.length; k++) {
            const tempData = {}

            //Group by period and sensortype and cal average
            const singledata = await Sensorrecord.aggregate([
                { $match: { period: periods[i]._id, sensortype: sensortypes[k]._id } },
                {
                    $group: {
                        _id: "$period",
                        value: { $avg: "$value" }
                    }
                }
            ])
            //If no data , go to next sensortype
            if (singledata.length < 1) continue

            //tempData.sensortype = sensortypes[k].sensortype
            //tempData.value = singledata[0].value

            var abbreviation = sensortypes[k].abbreviation
            tempData[abbreviation] = singledata[0].value
            objData[abbreviation] = "" + singledata[0].value
            tempArray.push(tempData)
        }
        //push start and end quantity in temp array
        tempArray.push({ 'start_qty': periods[i].start_quantity })
        objData["start_qty"] = "" + periods[i].start_quantity

        tempObj.data = tempArray
        data.push(tempObj)
    }

    console.log(objData);

    async function predictTablesRegression() {
        // Configure the endpoint resource
        const endpoint = `projects/${project}/locations/${location}/endpoints/${endpointId}`;
        const parameters = helpers.toValue({});

        // TODO (erschmid): Make this less painful
        const instance = helpers.toValue(objData);

        const instances = [instance];
        const request = {
            endpoint,
            instances,
            parameters,
        };

        // Predict request
        const [response] = await predictionServiceClient.predict(request);

        console.log('Predict tabular regression response');
        console.log(`\tDeployed model id : ${response.deployedModelId}`);
        const predictions = response.predictions;
        console.log('\tPredictions :');
        for (const predictionResultVal of predictions) {
            const predictionResultObj =
                prediction.TabularRegressionPredictionResult.fromValue(
                    predictionResultVal
                );
            console.log(predictionResultObj)
            result["Upper_bound"] = predictionResultObj.upper_bound;
            result["Lower_bound"] = predictionResultObj.lower_bound;
            result["value"] = predictionResultObj.value

        }
    }
    await predictTablesRegression();
    // [END aiplatform_predict_tabular_regression_sample]

    return res.status(201).json({ ok: 1, data: result })

})

router.get('/getPrediction', async (req, res) => {

    const periods = await Period.find({ periodId: req.query.periodid }, { 'periodId': 1, 'start_quantity': 1 })
    console.log(periods)
    if (periods.length == 0) return res.status(400).json({ ok: 0, msg: 'period not exist' })
    //Get all sensortype
    const sensortypes = await Sensortype.find({}, { 'sensortype': 1, 'abbreviation': 1 })

    let count = 0;
    var result = {};
    const objData = {};
    const data = []
    for (let i = 0; i < periods.length; i++) {
        const tempObj = {}
        const tempArray = []
        //Loop every sensortype
        for (let k = 0; k < sensortypes.length; k++) {
            const tempData = {}

            //Group by period and sensortype and cal average
            const singledata = await Sensorrecord.aggregate([
                { $match: { period: periods[i]._id, sensortype: sensortypes[k]._id } },
                {
                    $group: {
                        _id: "$period",
                        value: { $avg: "$value" }
                    }
                }
            ])
            //If no data , go to next sensortype
            if (singledata.length < 1) continue

            //tempData.sensortype = sensortypes[k].sensortype
            //tempData.value = singledata[0].value

            var abbreviation = sensortypes[k].abbreviation
            tempData[abbreviation] = singledata[0].value
            objData[abbreviation] = "" + singledata[0].value
            tempArray.push(tempData)
        }
        //push start and end quantity in temp array
        tempArray.push({ 'start_qty': periods[i].start_quantity })
        objData["start_qty"] = "" + periods[i].start_quantity

        tempObj.data = tempArray
        data.push(tempObj)
    }
    if (objData.ORP != null) {
        delete objData.ORP
    }
    if (objData.CAM != null) {
        delete objData.CAM
    }
    console.log(objData);


    const options = {
        method: "POST",
        url: process.env.DATA_PREDICTION_URL,

        headers: {
            "Content-Type": "application/json"
        },
        body:JSON.stringify( {
            "Inputs": {
                "data": [
                    objData
                ]
            },
            "GlobalParameters": 0.0
        })
    };

    const response = await request(options, async (err, response, body) => {

        console.log("HI");
        result = JSON.parse(body)
     
        
        try {
          

            console.log(`${moment().format('MMMM Do YYYY, h:mm:ss a')} : Period ${periods[0].periodId} end quantity predicted : ${result.Results} `);
            res.status(201).json({ ok: 1, data:result.Results })
            //res.status(201).json({ok:1,msg:`Sensorrecord(${sensortype.sensortype} : ${req.body.value}) data created in ${period.periodId}`})

        } catch (err) {
            //res.status(500).json(err)
            console.log(err)
        }
       
    });
    response.on('error',function(resp){
        return res.status(400).json({ok:0,msg:"Unknown"})
    })
    return 
  

})

process.on('unhandledRejection', err => {
    console.error(err.message);
    process.exitCode = 1;
});

module.exports = router