'use strict';

var APP_ID = "amzn1.echo-sdk-ams.app.ca7e2a16-1bf9-4b5b-8a7e-8c15fb0ccd9d";


var AlexaSkill = require('./AlexaSkill');



var SatTracker = function () {
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
//    var citySlot = intent.slots.City;
    var validZip = getFiveDigitZip(zipSlot.value);
    console.log("validating zipcode" + validZip);
    if (validZip == zipSlot.value) {
        var speechOutput = "The ISS will pass over " + zipSlot.value + "on " + session.attribute.final + "."
        response.tell(speechOutput);
    }

    var info = getZipcode(zipSlot.value, function(value) {
        console.log("starting getZipcode" + value);
        var final = lookupSatelliteFromNASA(value, function(info) {
        response.tellWithCard(info, "Test", info);                             
        });
        session.attributes.final = final;
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
            // Convert UTC time to correct timezone
            var timezone = tzlookup(latitude, longitude);
            console.log("Testing library " + tzlookup(latitude, longitude));
            
//            console.log(tzwhere.tzOffsetAt(whiteHouse['lat'], whiteHouse['lng']));
//            var timezoneoffset = tzwhere.tzOffsetAt(location['lat'], location['lng']);
            var isstime = result.response[0].risetime*1000;
            var passtime = new Date(isstime);
            console.log("ISS API passtime UTC " + isstime);
            var convertUTC = tz(passtime);
            var realtime = new Date(convertUTC);
//            var currenttime = moment.tz(realtime, timezone).format('Z');
            var currenttime = moment(realtime).tz(timezone).format('MMMM Do YYYY, h:mm:ss a');
            console.log("Time zone convert " + convertUTC + " Correct Time zone is " + currenttime);
            console.log("iss query succeeded. " + currenttime);
            var info = "The ISS will pass over " + currenttime + "."

            callback(info);
        }
    };

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
    // Create an instance of the SatTracker skill.
    var satellitetracker = new SatTracker();
    satellitetracker.execute(event, context);
};
