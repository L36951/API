const router = require('express').Router();
const { AccessApprovalClient } = require('@google-cloud/access-approval');
const aiplatform = require('@google-cloud/aiplatform');
router.get('/testing', async (req, res) => {
    const client = new AccessApprovalClient();
    const projectId = 'compact-system-345912';
    async function listRequests() {
        const requests = await client.listApprovalRequests({
            parent: `projects/${projectId}`,
        });
        console.info(requests);
    }
    listRequests();
})
router.get('/aiplatform', async (req, res) => {
    const endpointId = '3837436318426595328';
    const project = 'compact-system-345912';
    const location = 'asia-east2'
    const { prediction } = aiplatform.protos.google.cloud.aiplatform.v1.schema.predict;
    console.log('1');
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


    async function predictTablesRegression() {
        // Configure the endpoint resource
        const endpoint = `projects/${project}/locations/${location}/endpoints/${endpointId}`;
        const parameters = helpers.toValue({});

        // TODO (erschmid): Make this less painful
        const instance = helpers.toValue({
            video_id: 'dsadsa2xsa',
            title: 'apex',
            publishedAt: '2021-06-04T04:00:11Z',
            channelId: 'UCDVYQ4Zhbm3S2dlz7P1GBDg',
            channelTitle: 'JFFT',
            categoryId: '20',
            trending_date: '2021-06-17T00:00:00Z',
            tags: 'apex | legends',
            likes: '522',
            dislikes: '859.0',
            comment_count: '3000',
            thumbnail_link: 'https://i.ytimg.com/vi/hdmx71UjBXs/default.jpg',
            comments_disabled: 'false',
            ratings_disabled: 'false',
            description: 'funny'
        });

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
            console.log(`\tUpper bound: ${predictionResultObj.upper_bound}`);
            console.log(`\tLower bound: ${predictionResultObj.lower_bound}`);
            console.log(`\tLower bound: ${predictionResultObj.value}`);
        }
    }
    predictTablesRegression();
    // [END aiplatform_predict_tabular_regression_sample]

})
process.on('unhandledRejection', err => {
    console.error(err.message);
    process.exitCode = 1;
});
module.exports = router