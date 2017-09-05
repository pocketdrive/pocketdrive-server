import SyncCommunicator from "./communicator/sync-communicator";

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const users = require('./routes/users');
const sync = require('./routes/sync');
const share = require('./routes/share');

const ssdp = require('./utils/ssdp');

const app = express();

require('events').EventEmitter.defaultMaxListeners = Infinity;

async function main() {
     /*"use strict";
    await cm.connectToCentralServer('anuradha', 'device1234');
    await cm.requestOnlineDevices();*/

    ssdp.broadcast();
}

main();

import * as _ from 'lodash';
import fs from 'fs';
// import {Communicator} from './communicator/Communicator';

// let cm = new Communicator();

import {ChunkBasedSynchronizer} from './sync-engine/chunk-based-synchronizer'
import {SyncRunner} from './sync-engine/sync-runner'
import MetadataDBHandler from "./db/file-metadata-db";

const syncRunner = new SyncRunner();
const communicator = new SyncCommunicator('dulaj', '127.0.0.1', 5000);

async function syncTest() {
    // "use strict";
    // let oldChunks = await synchronizer.getChecksumOfChunks('/home/dulaj/pocketdrive/dulaj/Documents/old.txt');
    // let newChunks = await synchronizer.getChecksumOfChunks('/home/dulaj/pocketdrive/dulaj/Documents/new.txt');
    // let transmit = await synchronizer.getTransmissionData(oldChunks, newChunks, fs.readFileSync('/home/dulaj/pocketdrive/dulaj/Documents/new.txt'));
    //
    // synchronizer.updateOldFile(transmit, '/home/dulaj/pocketdrive/dulaj/Documents/old.txt').then();

    syncRunner.onAddNewSyncDirectory('dulaj', 'Documents');

    // syncRunner.scanMetadataDBForChanges('dulaj');

    /*MetadataDBHandler.getUpdatedFilesOfUser('dulaj').then((result) => {
        for (let i = 0; i < result.data.length; i++) {
            communicator.sendSyncRequest(result.data[i]);
        }
    });*/

    /*const o = await ChunkBasedSynchronizer.getChecksumOfChunks('/home/dulaj/pocketdrive/dulaj/Documents/2.txt');
    const n = await ChunkBasedSynchronizer.getChecksumOfChunks('/home/dulaj/pocketdrive/dulaj/Documents/2-1.txt');
    const t = await ChunkBasedSynchronizer.getTransmissionData(o, n, fs.readFileSync('/home/dulaj/pocketdrive/dulaj/Documents/2-1.txt'));

    console.log('o: ', o);
    console.log('n: ', n);
    console.log('t: ', t);

    ChunkBasedSynchronizer.updateOldFile(t, '/home/dulaj/pocketdrive/dulaj/Documents/2.txt');*/

    // let h1 = await getFolderChecksum('/home/dulaj/pocketdrive/dulaj/Documents/1');
    // let h2 = await getFolderChecksum('/home/dulaj/pocketdrive/dulaj/Documents/2');
    //
    // console.log(h1);
    // console.log(h2);

    // fs.renameSync('/home/dulaj/pocketdrive/dulaj/Documents/6', '/home/dulaj/pocketdrive/dulaj/Documents/5');

    // communicator.syncNewDirectory('dulaj/Documents/CSE Semester 8', 'dulaj/Documents/1/CSE Semester 7');/

}

syncTest();

import DataStore from 'nedb';
import {checkExistence, getFileChecksum, getFolderChecksum, isFolderEmpty} from "./sync-engine/sync-actions";
import {getCheckSum} from "./utils/meta-data";
// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', users);
app.use('/sync', sync);
app.use('/share', share);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;