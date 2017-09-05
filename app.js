import SyncCommunicator from "./communicator/sync-communicator";

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
import * as _ from 'lodash';
import fs from 'fs';

const users = require('./routes/users');
const sync = require('./routes/sync');
const share = require('./routes/share');

const ssdp = require('./utils/ssdp');

const app = express();

import {Communicator} from './communicator/Communicator';
import FileExplorer from './web-file-explorer-backend/file-explorer';

const ans = FileExplorer.list('anuradha', '/');
// console.log(ans)

let cm = new Communicator();

require('events').EventEmitter.defaultMaxListeners = Infinity;


async function main() {
    "use strict";
    await cm.connectToCentralServer('anuradha', 'device1234');
    await cm.requestOnlineDevices();
}

main();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

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