const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');

const users = require('./routes/users');
const sync = require('./routes/sync');
const nis = require('./routes/nis');
const share = require('./routes/share');

const ssdp = require('./utils/ssdp');

import {Communicator} from "./communicator/communicator";
import {SyncRunner} from "./sync-engine/sync-runner";
import {NisRunner} from "./nis-engine/nis-runner";

const app = express();

// require('events').EventEmitter.defaultMaxListeners = Infinity;

app.use(cors());

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/user', users);
app.use('/sync', sync);
app.use('/nis', nis);
app.use('/share', share);

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

async function main() {
    ssdp.broadcast();
    NisRunner.onPdStart();

    new Communicator().connectToCentralServer(process.env.ID);
}

main();

module.exports = app;