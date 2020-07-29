// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const CONVERSATION_DATA_PROPERTY = 'conversationData';
const USER_PROFILE_PROPERTY = 'userProfile';

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

    constructor(conversationState, userState) {
        super();

        // The state management objects for the conversation and user state.
        this.conversationState = conversationState;
        this.userState = userState;

        // Create the state property accessors for the conversation data and user profile.
        this.conversationDataAccessor = conversationState.createProperty(CONVERSATION_DATA_PROPERTY);
        this.userProfileAccessor = userState.createProperty(USER_PROFILE_PROPERTY);

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

        const qnaMaker = new QnAMaker({
            knowledgeBaseId: process.env.QnAKnowledgebaseId,
            endpointKey: process.env.QnAEndpointKey,
            host: process.env.QnAEndpointHostName
        });

        this.dispatchRecognizer = dispatchRecognizer;
        this.qnaMaker = qnaMaker;
        
        this.onMessage(async (context, next) => {
            console.log('Processing Message Activity.');

            // Get the state properties from the turn context.
            const userProfile = await this.userProfileAccessor.get(context, {});
            const conversationData = await this.conversationDataAccessor.get(context, { askedForDataProtection: false });

            // First, we use the dispatch model to determine which cognitive service (LUIS or QnA) to use.
            const qnaResults = await this.qnaMaker.getAnswers(context);
            const recognizerResult = await dispatchRecognizer.recognize(context);
            const intent = LuisRecognizer.topIntent(recognizerResult);

            // If Asked Data Protection:
            if (conversationData.askedForDataProtection) {
                switch (intent) {
                    case 'yes':
                        await context.sendActivity(`Okay, I will delete all personal data related to you!`);
                        break;
                    case 'no':
                        await context.sendActivity(`Nice, I like that you want to keep being a friend of mine ☺!`);
                        break;
                    default:
                        await context.sendActivity(`Sorry I did not understand.`);
                        break;
                    }
                conversationData.askedForDataProtection = false;

                await next();
                return;
            }

            // If an answer was received from QnA Maker, send the answer back to the user.
            if (qnaResults[0]) {
                await context.sendActivity(qnaResults[0].answer);

            // If no answers were returned from QnA Maker, reply with help.
            } else {
                switch (intent) {
                    case 'anxiety':
                        await context.sendActivity(`It's okay to be afraid!`);
                        break;
                    case 'confused':
                        await context.sendActivity(`It's okay to be confused!`);
                        break;
                    case 'isolation':
                        await context.sendActivity(`It's okay to feel alone!`);
                        break;
                    case 'technical':
                        await context.sendActivity(`I am built on Natural Language Understanding, Machine Learning and Awesome If-Logic 😎!`);
                        break;
                    case 'data_protection':
                        conversationData.askedForDataProtection = true;
                        await this.sendSuggestedActions(context);
                        break;

                    default:
                        context.sendActivity({ attachments: [this.createThumbnailCard(recognizerResult.text)] });
                        await this.sendSuggestedActions2(context);
                        break;
                    }
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


    /**
     * Override the ActivityHandler.run() method to save state changes after the bot logic completes.
     */
    async run(context) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }

    /**
     * Send suggested actions to the user.
     * @param {TurnContext} turnContext A TurnContext instance containing all the data needed for processing this conversation turn.
     */
    async sendSuggestedActions(turnContext) {
        var reply = MessageFactory.suggestedActions(['Yes, please!', 'No, thank you!'], 'Yes we do comply with GDPR. Do you want to delete all your personal data?');
        await turnContext.sendActivity(reply);
    }

    async sendSuggestedActions2(turnContext){
        var reply = MessageFactory.suggestedActions(['I feel anxious', 'I feel lonely', 'I am a bit overwhelmed.', 'I feel great.'], '');
        await turnContext.sendActivity(reply);
    }
    createThumbnailCard(query) {
        return CardFactory.thumbnailCard(
            'GrowthBot could not support you',
            [{ url: 'https://github.com/l8518/msft-silverlining-chat-bot-challenge/raw/master/GrowthBotLogo.png' }],
            [{
                type: 'openUrl',
                title: 'Search with Bing',
                value: 'https://www.bing.com/search?q='+ query
            }],
            {
                subtitle: 'We are continually learning and will support more.',
                text: 'Currently, growth bot supports remote learners mentally. Click Search with Bing to be redirected to Bing. If you need support emotionally, choose one of the options below.'
            }
        );
    }

}

module.exports.TeamsConversationBot = TeamsConversationBot;
