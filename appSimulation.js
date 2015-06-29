var http = require("http");
var express = require('express');
var app = express();
var uuid = require('uuid');

//global
var iridArray = [];
var driver = require("couchbase");
var cb = new driver.Cluster("192.168.106.101:8091");
var myBucket = cb.openBucket("recording");
var maxdocs = 5000; // Total number of users
var streamMin = 10;  // Minimum
var streamMax = 20;  // Maximum
var batchMin = 1;  // Shows Minimum
var batchMax = 11;  // Shows Maximum
var segments = 1800 // Show segments (1 hours recordings)

var incnumber = 0;      // Control loop counter
var segnumber = 0;      // Control loop counter
var streamnumber = 0;   // Control loop counter
var start_time = new Date();
var end_time = new Date(start_time.getTime() + 60*60000);

/**
 *
 *
 */
IRIDburst(function(err,iridCount){
    if(err){
        console.log(err);
        return;
    }
    if(iridCount){
        console.log("SUCCESS:",iridCount," customer recordings started.");
        setBatch(function(err,resultData){
            if(err){
                console.log(err);
                return;
            }
            if(resultData) {
                console.log("SUCCESS:", resultData," batches are set for recording segments.");
                segmentBurst(function(err,resultRecord) {
                    if(err) {
                        console.log(err);
                        return;
                    }
                    if (resultRecord) {
                        console.log("COMPLETE:" + resultRecord);
                    }
                })
            }
        })
    }
});

/**
 *
 * @param done
 * Creation of recording documents based on incrementing value defined by maxdocs.
 * XRID to IRID translation is controlled within RIO.
 * Can we use XRID as key in recording document?
 */
function IRIDburst(done) {
    for(var i=1;i<=maxdocs;i++){
        // Recording document definition
        var recordingDoc = {
            "_irid":i,
            "xrid": uuid.v1(),
            "stream_id" : "stream" + randomInt(streamMin,streamMax),
            "isActive" : randomString(5),
            "a8_url" : "http://" + randomString(15) + "." + randomString(3),
            "start_time" : start_time,
            "end_time" : end_time,
            "erased_time" : new Date(start_time.getTime() + 1440*60000),
            "actual_start_time" : start_time,
            "actual_end_time" : end_time,
            "batch_id" : "batch" + randomInt(batchMin,batchMax),
            "error_code" : uuid.v4(),
            "is_timeline" : "false",
            "is_rm_notify" : "false"
        }
        /**
         * Simulate users requesting simultaneous recordings
         * maxdocs represents the total number of customer requests
         * recordingDoc is the individual recording document per customer per show
         */
        myBucket.upsert(recordingDoc._irid.toString(), recordingDoc, function (err, newIRID) {
            if (err) {
                console.log("ERR:", err.message);
                done(err,null);
                return;
            }
            if(newIRID){
                incnumber++;
                iridArray.push(recordingDoc._irid);
                if(incnumber==maxdocs){
                    done(null,iridArray.length);
                    return;
                }
            }
        });
    }
}
/**
 *
 * @param done
 * Create a batch document based on recording requests using the batch_id from the recording documents.
 * For each batch a batchDoc is created.
 */
function setBatch(done) {
    var batchDoc = {
        jump_time: null,
        //batch_id: Math.floor((Math.random() * 100) + 1),
        active_recordings: null,
        version: uuid.v4(),
        copy_count : "//get from iridArray",
        currentCount : 1800
    }
    var curBatch=batchMin;
    for (var i = batchMin; i < batchMax+1; i++) {
        console.log("  BATCH: ", i);
        myBucket.upsert("batch"+i, batchDoc, function (err, newBatch) {
            if (err) {
                console.log("ERR:", err.message);
                done(err, null);
                return;
            } if (newBatch) {
                curBatch++;
                if(curBatch==batchMax) {
                    done(null, batchMax);
                    return;
                }
            }
        });
    }
}

/**
 *
 * @param resultRecord
 * For each segment needed pass the batch id to the segment builder.
 */
function segmentBurst(resultRecord) {
    console.log("  BATCH:BURST");
    function segBuilder(i) {
        console.log("  BATCH: ",i);
        if (i < batchMax+1) {
            buildSegment(i, function (err, segBuilt) {
                if (err) {
                    resultRecord(err, null);
                    return;
                }
                if (segBuilt) {
                    segnumber=0;
                    segBuilder(i + 1);
                }
            });
        }
        else {
            resultRecord(null,batchMax);
        }
    }
    segBuilder(batchMin);
}


/**
 *
 * @param batchID
 * @param done
 * Create a segment for 2 second interval of the complete recording request.
 * For now we are assuming 1 hour shows (1800 segments). Modify to calculate based on start/stop time.
 */
function buildSegment(batchID,done) {
    console.log("    SEGMENT:BATCH ",batchID,":",segments, " segments");
    for (var j=1; j <=segments; j++) {
        // Current Stream Document
        var currentBatch = "batch" + batchID;

        // Create a Segment
        var segmentDoc = {
            segment_num: (randomInt(0, 18446744073709551615)),
            jump_time: null,
            stream_id: currentBatch,
            segment: "http://" + randomString(15) + "." + randomString(3),
            period_first: "na",
            period_current: "na",
            period_last: "na",
            rep_id: "1 Mbps",
            start_time: new Date(),
            duration_pts: 2,
            actual_copy_cnt: "//capture in streamDoc",
            is_archived: "false",
            batch_list: null
        }
        // Insert Segment
        var segmentKey = currentBatch + "::" + j;
        myBucket.upsert(segmentKey, segmentDoc, function (err, newSegment) {
            if (err) {
                console.log("ERR:", err.message);
                done(err, null);
                return;
            }
            if (newSegment) {
                segnumber++;
                if(segnumber==segments){
                    console.log("    SEGMENT:BATCH ",batchID,":",segments," built");
                    done(null,segments);
                    return;
                }
            }
        });
    }
}
/**
 *
 * @param hi
 * @returns {number}
 */
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

/**
 * To Do: Add UI interface
 */
app.listen(3000);
