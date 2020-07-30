// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { CardFactory } = require('botbuilder');


module.exports  = (function MainDialog(){
    
    async function processGenMess(context, {url, text, type}){
        switch(type){
            case 'image':
                await context.sendActivity({ attachments: [createImageCard(url, text)] } );
                break;
            case 'video':
                await context.sendActivity({ attachments: [createVideoCard(url, text)] });
        }
        
    }
    function createImageCard(url, text){
        return CardFactory.heroCard(
            text,
            CardFactory.images([url])
        );
        return CardFactory.image(text,
            [url]);
    }
    function createAudioCard(url, text) {
        return CardFactory.audioCard(
            text,
            [url],
        );
    }


    function createVideoCard(url, text) {
        return CardFactory.videoCard(
            text,
            [{ url}]
        );
    }
    return processGenMess;
})();
