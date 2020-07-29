// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    TurnContext,
    MessageFactory,
    TeamsInfo,
    TeamsActivityHandler,
    CardFactory,
    ActionTypes
} = require('botbuilder');
const { LuisRecognizer, QnAMaker } = require('botbuilder-ai');


const TextEncoder = require('util').TextEncoder;

class TeamsConversationBot extends TeamsActivityHandler {
    constructor() {
        super();

        console.log('test - 2')
        console.log(process.env)

        // If the includeApiResults parameter is set to true, as shown below, the full response
        // from the LUIS api will be made available in the properties  of the RecognizerResult
        const dispatchRecognizer = new LuisRecognizer({
            applicationId: process.env.LuisAppId,
            endpointKey: process.env.LuisAPIKey,
            endpoint: `https://${process.env.LuisAPIHostName}.api.cognitive.microsoft.com`
        }, {
            includeAllIntents: true,
            includeInstanceData: true
        }, true);

        console.log('test - 3')

        const qnaMaker = new QnAMaker({
            knowledgeBaseId: process.env.QnAKnowledgebaseId,
            endpointKey: process.env.QnAEndpointKey,
            host: process.env.QnAEndpointHostName
        });

        console.log('test - 4')

        this.dispatchRecognizer = dispatchRecognizer;
        this.qnaMaker = qnaMaker;

        this.onMessage(async (context, next) => {
            console.log('Processing Message Activity.');

            // First, we use the dispatch model to determine which cognitive service (LUIS or QnA) to use.
            //const recognizerResult = await dispatchRecognizer.recognize(context);
            const qnaResults = await this.qnaMaker.getAnswers(context);
            
            console.log('reocni')

            // // Top intent tell us which cognitive service to use.
            // const intent = LuisRecognizer.topIntent(recognizerResult);

            // // Next, we call the dispatcher with the top intent.
            // await this.dispatchToTopIntentAsync(context, intent, recognizerResult);

            // await next();

            // If an answer was received from QnA Maker, send the answer back to the user.
            if (qnaResults[0]) {
                // await this.getSingleMember(context, qnaResults[0].answer);
                await context.sendActivity(qnaResults[0].answer);
                // await context.sendActivity(qnaResults[0].answer);

            // If no answers were returned from QnA Maker, reply with help.
            } else {

                //luis and bing api
                
                // TODO: 
                // intent handling
                // with overview on commands (intent)
                // with alternative of using the bing api?
                

                await context.sendActivity('No QnA Maker answers were found.');
                // await this.getSingleMember(context, 'No QnA Maker answers were found.');
            }
            await next();
            
        });

        this.onMembersAdded(async (context, next) => {
            const welcomeText = 'Type a greeting or a question about the weather to get started.';
            const membersAdded = context.activity.membersAdded;

            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity(`Welcome to Dispatch bot ${ member.name }. ${ welcomeText }`);
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    async dispatchToTopIntentAsync(context, intent, recognizerResult) {

        console.log(intent)

        switch (intent) {
        case 'l_GrowthBot':
            await this.processWeather(context, recognizerResult.luisResult);
            break;
        case 'q_psychology':
            await this.processSampleQnA(context);
            break;
        case 'q_psychology-kb-energy':
            await this.processSampleQnA(context);
            break;
        default:
            console.log(`Dispatch unrecognized intent: ${ intent }.`);
            await context.sendActivity(`Dispatch unrecognized intent: ${ intent }.`);
            break;
        }
    }

    async processHomeAutomation(context, luisResult) {
        console.log('processHomeAutomation');

        // Retrieve LUIS result for Process Automation.
        const result = luisResult.connectedServiceResult;
        const intent = result.topScoringIntent.intent;

        await context.sendActivity(`HomeAutomation top intent ${ intent }.`);
        await context.sendActivity(`HomeAutomation intents detected:  ${ luisResult.intents.map((intentObj) => intentObj.intent).join('\n\n') }.`);

        if (luisResult.entities.length > 0) {
            await context.sendActivity(`HomeAutomation entities were found in the message: ${ luisResult.entities.map((entityObj) => entityObj.entity).join('\n\n') }.`);
        }
    }

    async processWeather(context, luisResult) {
        console.log('processWeather');

        // Retrieve LUIS results for Weather.
        const result = luisResult.connectedServiceResult;
        const topIntent = result.topScoringIntent.intent;

        await context.sendActivity(`ProcessWeather top intent ${ topIntent }.`);
        await context.sendActivity(`ProcessWeather intents detected:  ${ luisResult.intents.map((intentObj) => intentObj.intent).join('\n\n') }.`);

        if (luisResult.entities.length > 0) {
            await context.sendActivity(`ProcessWeather entities were found in the message: ${ luisResult.entities.map((entityObj) => entityObj.entity).join('\n\n') }.`);
        }
    }

    async processSampleQnA(context) {
        console.log('processSampleQnA');

        const results = await this.qnaMaker.getAnswers(context);

        console.log('res', results)
        if (results.length > 0) {
            await context.sendActivity(`${ results[0].answer }`);
        } else {
            await context.sendActivity('Sorry, could not find an answer in the Q and A system.');
        }
    }
}

module.exports.TeamsConversationBot = TeamsConversationBot;
