const express = require('express');
const router = express.Router();

import * as _ from 'lodash';

import * as fileUtils from '../utils/file';
import { SyncDbHandler } from '../db/sync_db';

const dbh = new SyncDbHandler();

router.post('/list', function (req, res, next) {
    let data = req.body.data;
    let folderpath = process.env.PD_FOLDER_PATH + data.username;

    fileUtils.firstLevelFolders(folderpath).then((result) => {
        dbh.getSyncFolders(data.username).exec((err, doc) => {
            if (doc != null) {
                _.each(doc.syncFolders, (folderName) => {
                    _.each(result, (folder) => {
                        if (folder.name == folderName) {
                            folder.sync = true;
                        }
                    })
                })
            }

            res.set('Content-Type', 'application/json');
            res.send(result);
        })
    })

});

router.post('/set', function (req, res, next) {
    let data = req.body.data;
    // console.log(data.username);
    // console.log(data.syncFolders);

    dbh.setSyncFolders(data.username, data.syncFolders).then((result) => {
        res.set('Content-Type', 'application/json');
        res.send(result);
    })

});

module.exports = router;