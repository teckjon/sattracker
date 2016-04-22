'use strict';

var APP_ID = "amzn1.echo-sdk-ams.app.ca7e2a16-1bf9-4b5b-8a7e-8c15fb0ccd9d";


var AlexaSkill = require('./AlexaSkill');



var ISStracker = function () {
    AlexaSkill.call(this, APP_ID);
};
var AWS = require("aws-sdk");
AWS.config.update({region: "us-east-1"});
var doc = require("dynamodb-doc");

var ok = require("assert")
    , eq = require("assert").equal
    , tz = require("timezone");
var us = tz(require("timezone/America"));
var tzlookup = require("tz-lookup");
var moment = require("moment-timezone");
var request = require("request");
var dynamodb = new AWS.DynamoDB.DocumentClient();
ISStracker.prototype = Object.create(AlexaSkill.prototype);
ISStracker.prototype.constructor = ISStracker;

ISStracker.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("ISStracker onSessionStarted requestId: " +
                sessionStartedRequest.requestId +
                ", sessionId: " +
                session.sessionId);
};

ISStracker.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("ISStracker onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);

    var speechOutput = "Sat Tracker is running, please say a zipcode and I will respond with the closest satellite.";
    var repromptText = "Please say a zipcode.";
    response.ask(speechOutput, repromptText);
};

ISStracker.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("ISStracker onSessionEnded requestId: " + sessionEndedRequest.requestId + ", sessionId: " + session.sessionId);
};

ISStracker.prototype.intentHandlers = {
    
    "GetSatelliteIntent": getISSIntent,

    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("You can ask ISS Tracker for the time the ISS will pass over your zip code.");
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

function getISSIntent(intent, session, response) {
    console.log("getISSIntent handling starting");
    var zipSlot = intent.slots.Zipcode;
//    var validZip = getFiveDigitZip(zipSlot.value);
//    console.log("validating zipcode " + validZip);
    
//    if (validZip == zipSlot.value) {
//        var speechOutput = "The ISS will pass over " + zipSlot.value + "on " + session.attribute.final + "."
//        response.tell(speechOutput);
//    }
    if (!zipSlot || (zipSlot.length != 5)) {
        console.log("Error with zipcode input.")
        var speech = "I'm sorry, please say a valid five digit zipcode and I will find the next ISS pass time.";
        var reprompt = "Please say a zipcode.";
        response.ask(speech, reprompt);
        return;
    }
    var info = getZipcode(zipSlot.value, function(value) {
        console.log("starting getZipcode" + value); 

        var final = lookupISS(value, function(info) {
        response.tellWithCard(info, "Test", info);                             
        
        });
    }); 
};

// Query DynamoDB     
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
        console.log ("Query failed at DynamoDB " + err);
        callback(err);
    } else {
        callback(data);
        console.log("Query succeeded.");   
    }
    });  
};

// Query ISS pass API
function lookupISS(getZipcode, callback) {
    
    if (getZipcode.Items[0] == null) {
        console.log("Invalid zipcode")
        var speech = "I'm sorry, please say a valid five digit zipcode and I will find the next ISS pass time.";
        callback(speech);
    } else {
    var latitude = getZipcode.Items[0].latitude;
       console.log("latitude set " + latitude);
    var longitude = getZipcode.Items[0].longitude;
       console.log("longitude set " + longitude);       
    var url = "http://api.open-notify.org/iss-pass.json?lat=" + latitude + "&lon=" + longitude;
    
    var handleResponse = function(err, result) {
        var speech = "I'm sorry, there was an error looking up data from the ISS API.";
        console.log("lookup done: " + JSON.stringify(result));
        if (err) {            
            console.log("There was an error " + err);
            callback(speech);
        } else {
            // Find Time Zone
            var timezone = tzlookup(latitude, longitude);
            console.log("Testing library " + tzlookup(latitude, longitude));
            // Convert UTC seconds to M:D:Y, H:M:S format
            var isstime = result.response[0].risetime*1000;
            var passtime = new Date(isstime);
            console.log("ISS API passtime UTC " + isstime);
            var convertUTC = tz(passtime);
            var realtime = new Date(convertUTC);
            var currenttime = moment(realtime).tz(timezone).format('MMMM Do YYYY, h:mm:ss a');
            console.log("Time zone convert " + convertUTC + " Correct Time zone is " + currenttime);
            console.log("iss query succeeded. " + currenttime);
            // voice response
            var info = "The ISS will pass over " + currenttime + "."

            callback(info);
        }
    }};

    request(url, function (err, httpresp, body) {
        if (!err && httpresp.statusCode === 200) {
            var result = JSON.parse(body);
            console.log(JSON.parse(body));
            handleResponse(null, result);
        } else {
            callback(err);
        }
    });    
}
// Might be useful to validate zipcode
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
    // Create an instance of the ISStracker skill.
    var satellitetracker = new ISStracker();
    satellitetracker.execute(event, context);
};
