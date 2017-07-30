require('dotenv').config();

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var users = require('./routes/users');
var folder_listing = require('./routes/folder_listing');
var share_folder = require('./routes/share_folder');

var app = express();

import {Communicator} from './Communicator/Communicator';

let cm = new Communicator();
async function main() {
  "use strict";
  await cm.connectToCentralServer('anuradha', 'device1234');
  await cm.requestOnlineDevices();
}
main()

// import {Synchronizer} from './SyncEngine/Synchronizer';
// import fs from 'fs';
// let syn = new Synchronizer();
//
// async function main() {
//   "use strict";
//   let oldChunks = await syn.getChunks('/Users/anuradhawick/Documents/FYP\ work/file_sync/target/B.pdf');
//   let newChunks = await syn.getChunks('/Users/anuradhawick/Documents/FYP\ work/file_sync/A.pdf');
//   let transmit = await syn.getTransmissionData(oldChunks, newChunks, fs.readFileSync('/Users/anuradhawick/Documents/FYP\ work/file_sync/A.pdf'));
//
//   syn.updateOldFile(transmit,'/Users/anuradhawick/Documents/FYP\ work/file_sync/target/B.pdf').then();
//
// }
//
// main();

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', users);
app.use('/folder-list',folder_listing);
app.use('/share-folder',share_folder);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;