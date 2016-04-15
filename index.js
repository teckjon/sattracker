'use strict';

var APP_ID = "amzn1.echo-sdk-ams.app.ca7e2a16-1bf9-4b5b-8a7e-8c15fb0ccd9d";


var AlexaSkill = require('./AlexaSkill');



var SatTracker = function () {
    AlexaSkill.call(this, APP_ID);
};
var AWS = require("aws-sdk");
AWS.config.update({region: "us-east-1"});
var doc = require("dynamodb-doc");
var request = require("request");
//var dynamodb = new AWS.DynamoDB();
var dynamodb = new AWS.DynamoDB.DocumentClient();
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

    var speechOutput = "Sat Tracker is running, please say a zipcode and I will respond with the closest satellite.";
    var repromptText = "Please say a zipcode.";
    response.ask(speechOutput, repromptText);
};

SatTracker.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("SatTracker onSessionEnded requestId: " + sessionEndedRequest.requestId + ", sessionId: " + session.sessionId);
};

SatTracker.prototype.intentHandlers = {
    
    "GetSatelliteIntent": getSatIntent,

    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("You can ask Sat Tracker for name of the satellite closest to your zip code.");
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
    
    
//    if (zipSlot) {
//        var checkZip = getFiveDigitZip(zipSlot.value);
//    }
//     
//    var cardTitle = "Latitude and Longitude for " + zipSlot.value + " is " + ,
//        speechOutput,
//        repromptOutput;
    var info = getZipcode(zipSlot.value, function(value) {
        console.log("starting getZipcode" + value);
        var final = lookupSatelliteFromNASA(value, function(info) {
            response.tellWithCard("hi teck","zip info from dynamoDB", final);                               
        });
    });
};

    
function getZipcode(zipcode, callback) {

    var queryParams = {
        TableName : "ZipcodeUSA",

        KeyConditionExpression: "#zc = :zipcode",
        
        ExpressionAttributeNames:{
            "#zc": "zipcode"
        },
        ExpressionAttributeValues: {
            ":zipcode": zipcode,
        }, 
        "ComparisonOperator": "EQ",
        "ProjectionExpression": "latitude, longitude"
    };

console.log("queryParams prior to dynamodb.query: " + queryParams)
dynamodb.query(queryParams, function(err, data) {
    console.log("data: " + data);
    if (err) {
        console.log (err);
        callback(err);
    } else {
        callback(data);
        console.log("Query succeeded.");   
//        lookupSatelliteFromNASA(zipcode, function(err, license){
//            
//        })
    }
    });  
};

function lookupSatelliteFromNASA(getZipcode, callback) {
    var latitude = getZipcode.Items[0].latitude;
       console.log("latitude set " + latitude);
    var longitude = getZipcode.Items[0].longitude;
       console.log("longitude set " + longitude);       
    var url = "http://api.open-notify.org/iss-pass.json?lat=" + latitude + "&lon=" + longitude;
    
    var handleResponse = function(err, result) {
        console.log("lookup done: " + JSON.stringify(result));
        if (err) {
            console.log(err);
        } else {
            callback(result);
            var passtime = new Date(result.response[0].risetime*1000);
            passtime.toLocaleString();
            console.log("iss query succeeded. " + passtime.toLocaleString());
        }
    };
    
    request(url, function (err, httpresp, body) {
        if (!err && httpresp.statusCode === 200) {
            var result = JSON.parse(body);
            handleResponse(null, result);
        } else {
            callback(err);
        }
    });    
}
//console.log("after query")
//function getFiveDigitZip(zipString) {
//    var temp = 0;
//    try {
//        var tokens = zipString.split(" ");
//        if (tokens.length === 5) {
//            temp = parseInt("" + singleDigitWordtoNum(tokens[0]) + singleDigitWordtoNum(tokens[1]) + singleDigitWordtoNum(tokens[2]) + singleDigitWordtoNum(tokens[3]) + singleDigitWordtoNum(tokens[4]));
//        }
//        else {
//            console.log("getFiveDigitZipSplitException", tokens, zipString);
//        }
//    }
//    catch (excp) {
//        console.log("getGiveDigitZipException", excp)
//    }
//    return temp;
//}
exports.handler = function (event, context) {
    // Create an instance of the SatTracker skill.
    var satellitetracker = new SatTracker();
    satellitetracker.execute(event, context);
};
