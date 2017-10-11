import express from 'express';
import path from 'path';
import ShareFolder from "../share-folder-backend/share-folder";
import * as async from 'async';
import {CommonUtils} from "../utils/common";
import FileExplorer from "../web-file-explorer-backend/file-explorer";
import ShareFolderDbHandler from "../db/share-folder-db";

const router = express.Router();

router.post('/list', CommonUtils.authorize, async function (req, res, next) {
    res.set('Content-Type', 'application/json');

    let sharedFolders = await ShareFolderDbHandler.searchOwner(req.username);
    let receivedFolders = await ShareFolderDbHandler.searchRecievedFiles(req.username);
    let result = FileExplorer.list(req.username, req.body.path, sharedFolders, receivedFolders).result;

    console.log(result);
    res.send(JSON.stringify(result));
});

/**   {
 *      "username_from":"anuradha",
 *       "candidates":[{"username":"dulaj","permission":"rw"},{"username":"dulaj","permission":"rw"}],
 *       "path":"/home/anuradha/PocketDrive/vidura/TestFolder",
 *       "folder_name":"TestFolder"
 *   }
 **/
router.post('/share', function (req, res, next) {
    console.log(req.body.candidates);
    res.set('Content-Type', 'application/json');

    let response = [];
    let itemCounter = 0;
    let overallSuccess = true;

    async.each(req.body.candidates, (candidate) => {
        ShareFolder.share(req.body, candidate, (result) => {
            itemCounter++;
            if (!result.success) {
                let msg = {};
                overallSuccess = false;
                msg.username = candidate.username;
                msg.error = result.error;
                response.push(msg);
            }

            if (itemCounter === req.body.candidates.length) {
                let finalResult = {
                    "success": overallSuccess,
                    "msg": response
                };

                res.send(JSON.stringify(finalResult));
            }
        });
    });

});

/**{
*	    "username_from":"vidura",
*	    "candidates":["pamoda","dulaj"],
*	    "path":"/home/anuradha/PocketDrive/vidura/TestFolder",
*	    "folder_name":"TestFolder"
*    }
 **/
router.post('/unshare', function (req, res, next) {
    res.set('Content-Type', 'application/json');

    let response = [];
    let itemCounter = 0;
    let overallSuccess = true;

    async.each(req.body.candidates, (candidate) => {
        ShareFolder.unshare(req.body, candidate, (result) => {
            itemCounter++;
            if (!result.success) {
                let msg = {};
                overallSuccess = false;
                msg.username = candidate;
                msg.error = result.error;
                response.push(msg);
            }
            if (itemCounter === req.body.candidates.length) {
                let finalResult = {
                    "success": overallSuccess,
                    "msg": response
                };

                res.send(JSON.stringify(finalResult));
            }
        });
    });
});

/**  {
*	"username_from":"anuradha",
*	"candidates":[{"username":"pamoda","permission":"rw"}],
*	"path":"/home/anuradha/PocketDrive/vidura/TestFolder",
*	"folder_name":"TestFolder"
*   }
 **/
router.post('/change-permission', function (req, res, next) {
    res.set('Content-Type', 'application/json');

    let response = [];
    let itemCounter = 0;
    let overallSuccess = true;

    async.each(req.body.candidates, (candidate) => {
        ShareFolder.changePermission(req.body, candidate, (result) => {
            itemCounter++;

            if (!result.success) {
                let msg = {};
                overallSuccess = false;
                msg.username = candidate.username;
                msg.error = result.error;
                response.push(msg);
            }
            if (itemCounter === req.body.candidates.length) {
                let finalResult = {
                    "success": overallSuccess,
                    "msg": response
                };

                res.send(JSON.stringify(finalResult));
            }
        });
    });
});
module.exports = router;