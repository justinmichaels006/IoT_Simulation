var http = require("http");
var express = require('express');
var app = express();
var lineReader = require('line-reader');
var uuid = require('uuid');

//global
var segmentArray = [];
var driver = require("couchbase");
var cb = new driver.Cluster("192.168.106.101:8091");
var myBucket = cb.openBucket("recording");
var maxdocs = 5000; // Total number of users
var theBatch = null;
var totalSegments = 1800;
var IRID = randomInt(1, maxdocs).toString();

var incnumber = 0;      // Control loop counter
var segnumber = 0;      // Control loop counter
var streamnumber = 0;   // Control loop counter
var start_time = new Date();
var end_time = new Date(start_time.getTime() + 60*60000);

/**
 *
 */
getRecording(function(err,getBatch) {
    if (err) {
        console.log(err);
        return;
    }
    if (getBatch) {
        console.log(IRID + " Recording Started: Batch " + getBatch);
        getSegments(function(err,resultSegments) {
                if (err) {
                    return console.log(err);
                }
                if (resultSegments) {
                    //do something
                }
            })
        }
});
/**
 *
 * @param done
 */
function getRecording(done) {

    myBucket.get(IRID, function (err, playBack) {
        if (err) {
            console.log("ERR:", err.message);
            done(err, null);
            return;
        }
        if (playBack) {
            console.log("Recording: " + IRID + " Requested");
            return done(null, JSON.stringify(playBack));
        }
    })

}

function getSegments(done) {

    for (var i; i < totalSegments; i++) {
        var theKey = (theBatch + "::" + i).toString();
        myBucket.get(theKey, function (err, done) {
            if (err) {
                console.log("ERR:", err.message);
                done(err,null);
                return;
            }
            if(done) {
                incnumber++;
                segmentArray.push(done._irid);
                //console.log("DEBUG: ",segmentArray);
                if (incnumber == segments) {
                    return(null,segmentArray.length);
                }
            }
        });
    }
}
/**
 *
 * @param done
 */
function getSegments(done) {
    //console.log("SEGMENTS: " + getSegments)
    return;
}

function randomNum(hi){
    return Math.floor(Math.random()*hi);
}
/**
 *
 * @returns {string}
 */
function randomChar(){
    return String.fromCharCode(randomNum(10));
}
/**
 *
 * @param length
 * @returns {string}
 */
function randomString(length){
    var str = "";
    for(var i = 0; i < length; ++i){
        str += randomChar();
    }
    return str;
}
/**
 *
 * @param mincount
 * @param maxcount
 * @returns {number}
 */
function randomInt (mincount, maxcount) {
    return Math.floor(Math.random() * (maxcount - mincount) + mincount);
}

app.listen(3000);

