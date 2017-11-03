/**
 * @author Dulaj Atapattu
 */

import express from 'express';

import * as fileUtils from '../utils/file';
import SyncDbHandler from '../db/sync-db';
import {CommonUtils} from '../utils/common';

const router = express.Router();

router.post('/list', CommonUtils.authorize, function (req, res, next) {
    res.set('Content-Type', 'application/json');

    let folderPath = process.env.PD_FOLDER_PATH + req.username;

    fileUtils.firstLevelFolders(folderPath)
        .then((firstLevelFolders) => {
            SyncDbHandler.getSyncFolders(req.username)
                .then((dbResult) => {
                    if (dbResult.success) {
                        if (dbResult.data !== null) {
                            for (let i = 0; i < dbResult.data.length; i++) {
                                for (let j = 0; j < firstLevelFolders.length; j++) {
                                    if (dbResult.data[i] === firstLevelFolders[j].name) {
                                        firstLevelFolders[j].sync = true;
                                    }
                                }
                            }
                        }

                        res.send(firstLevelFolders);
                    } else {
                        res.send(dbResult);
                    }
                })
        });
});

router.post('/set', CommonUtils.authorize, function (req, res, next) {
    let data = req.body.data;
    // TODO Use sync-flow registerFiles method here for each folder

    SyncDbHandler.setSyncFolders(req.username, data.deviceId, data.syncFolders).then((result) => {
        res.set('Content-Type', 'application/json');
        res.send(result);
    })

});

module.exports = router;