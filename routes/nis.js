/**
 * @author Dulaj Atapattu
 */

import express from 'express';

import * as fileUtils from '../utils/file';
import {CommonUtils} from '../utils/common';
import NisDbHandler from "../db/nis-db";
import {NisRunner} from "../nis-engine/nis-runner";

const router = express.Router();

router.post('/list', CommonUtils.authorize, function (req, res, next) {
    res.set('Content-Type', 'application/json');

    let folderPath = process.env.PD_FOLDER_PATH + req.username;

    fileUtils.firstLevelFolders(folderPath)
        .then((firstLevelFolders) => {
            NisDbHandler.getSyncFolders(req.username, req.body.clientId)
                .then((dbResult) => {
                    if (dbResult.success) {
                        if (dbResult.data !== null) {
                            for (let i = 0; i < dbResult.data.length; i++) {
                                for (let j = 0; j < firstLevelFolders.length; j++) {
                                    if (dbResult.data[i].name === firstLevelFolders[j].name) {
                                        firstLevelFolders[j].syncDevices = dbResult.data[i].syncDevices;
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

    NisDbHandler.setSyncFolders(req.username, data.clientId, data.syncFolders).then((result) => {
        NisRunner.restartNis();
        res.set('Content-Type', 'application/json');
        res.send(result);
    })

});

module.exports = router;