'use strict';

var APP_ID = "amzn1.echo-sdk-ams.app.ca7e2a16-1bf9-4b5b-8a7e-8c15fb0ccd9d";


var AlexaSkill = require('./AlexaSkill');



var SatTracker = function () {
    AlexaSkill.call(this, APP_ID);
};

var doc = require("dynamodb-doc");
var dynamo = new doc.DynamoDB();

SatTracker.prototype = Object.create(AlexaSkill.prototype);
SatTracker.prototype.constructor = SatTracker;

SatTracker.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("SatTracker onSessionStarted requestId: " +
                sessionStartedRequest.requestId +
                ", sessionId: " +
                session.sessionId);
};

SatTracker.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("SatTracker onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);

    var speechOutput = "Sat Tracker is running, please say a city or zipcode and I will respond with the closest satellite.";
    var repromptText = "Please say a city or zipcode.";
    response.ask(speechOutput, repromptText);
};

SatTracker.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("SatTracker onSessionEnded requestId: " + sessionEndedRequest.requestId + ", sessionId: " + session.sessionId);
};

SatTracker.prototype.intentHandlers = {
    
    "GetSatelliteIntent": getSatIntent,
    //"GetSatelliteIntent": function (intent, session, response) {
        //response.tell(intent.slots.Zipcode.value);
    //},    
    
    
    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("You can ask Sat Tracker for name of the satellite closest to your city or zip code.");
    },
    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },
    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    }
};

function getSatIntent(intent, session, response) {
    console.log("getSatIntent handling starting");
    var zipSlot = intent.slots.Zipcode;
    var citySlot = intent.slots.City;
    
    
    if (zipSlot) {
        var checkZip = getFiveDigitZip(zipSlot.value);
    }
     
    var cardTitle = "Latitude and Longitude for " + zipSlot.value + " is ",
        speechOutput,
        repromptOutput;
    
    response.tell(cardTitle);
    getZipcode(zipSlot.value, getSatIntent)
};

    var zipCallback = function (err, zipcode) {
        if (zipcode) {
            console.log("Retrieved zip: " + JSON.stringify(zipcode));
            
            
        }
    }
    
function getZipcode(zipcode, callback) {

    var queryParams = {
        TableName: "ZipcodeUSA",
        KeyConditionExpression: "zipcode = :v_zipcode",
        ExpressionAttributeValues: {
            ":v_zipcode": zipcode
        }
    };

    dynamo.query(queryParams, function (err, data) {
        var zipdata;
        if (data && data.Items && data.Items.length > 0) {
            console.log("Found " + data.Items.length + " matching zipcode");
            if (data.Items.length === 1) {
                zipdata = data.Items[0];
            }
        }
        
        if (err) {
            console.log(err);
        }         
    })
};

function getFiveDigitZip(zipString) {
    var temp = 0;
    try {
        var tokens = zipString.split(" ");
        if (tokens.length === 5) {
            temp = parseInt("" + singleDigitWordtoNum(tokens[0]) + singleDigitWordtoNum(tokens[1]) + singleDigitWordtoNum(tokens[2]) + singleDigitWordtoNum(tokens[3]) + singleDigitWordtoNum(tokens[4]));
        }
        else {
            console.log("getFiveDigitZipSplitException", tokens, zipString);
        }
    }
    catch (excp) {
        console.log("getGiveDigitZipException", excp)
    }
    return temp;
}
exports.handler = function (event, context) {
    // Create an instance of the askQrz skill.
    var sattracker = new SatTracker();
    sattracker.execute(event, context);
};
