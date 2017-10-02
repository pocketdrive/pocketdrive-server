import {Communicator} from "./communicator/communicator";

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const users = require('./routes/users');
const sync = require('./routes/sync');
const share = require('./routes/share');
const share_folder = require('./routes/share_folder');

const ssdp = require('./utils/ssdp');

import {SyncRunner} from "./sync-engine/sync-runner";

const app = express();

require('events').EventEmitter.defaultMaxListeners = Infinity;

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/user', users);
app.use('/sync', sync);
app.use('/share', share);
app.use('/share_folder', share_folder);

/**
 * Catch 404 and forward to error handler
 */
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/**
 * error handler
 */
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

const log = console.log;

async function main() {

    ssdp.broadcast();
    // SyncRunner.onPdStart();
    // new Communicator().connectToCentralServer('PD12345');

}

main();

module.exports = app;