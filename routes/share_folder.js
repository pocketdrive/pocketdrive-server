import express from 'express';
import ShareFolder from "../share-folder-backend/share-folder";
import * as async from 'async';
import ShareFolderDbHandler from "../db/share-folder-db";


const router = express.Router();

/**   {
 *      "username_from":"anuradha",
 *       "candidates":[{"username":"dulaj","permission":"rw"},{"username":"dulaj","permission":"rw"}],
 *       "path":"/home/anuradha/PocketDrive/vidura/TestFolder",
 *       "folder_name":"TestFolder"
 *   }
 **/
router.post('/', function (req, res, next) {
    res.set('Content-Type', 'application/json');

    console.log("/share-folder");
    let response = [];
    let itemcounter = 0;
    let overallsuccess = true;

    async.each(req.body.candidates, (candidate) => {
        ShareFolder.share(req.body, candidate, (result) => {
            itemcounter++;
            let msg = {};
            msg.username = candidate.username;
            msg.success = result.success;
            if (!result.success) {
                overallsuccess = false;
                msg.error = result.error;
            }
            response.push(msg);
            if (itemcounter === req.body.candidates.length) {
                response.push({overallsuccess:overallsuccess});
                res.send(JSON.stringify(response));
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

    console.log("/share-folder/unshare")
    let response = [];
    let itemcounter = 0;
    let overallsuccess = true;

    async.each(req.body.candidates, (candidate) => {
        ShareFolder.unshare(req.body, candidate, (result) => {
            itemcounter++;
            let msg = {};
            msg.username = candidate;
            msg.success = result.success;
            if (!result.success) {
                overallsuccess = false;
                msg.error = result.error;
            }
            response.push(msg);
            if (itemcounter === req.body.candidates.length) {
                response.push({overallsuccess:overallsuccess});
                res.send(JSON.stringify(response));
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
router.post('/changepermission', function (req, res, next) {
    res.set('Content-Type', 'application/json');

    console.log("/share-folder/changepermission");
    let response = [];
    let itemcounter = 0;
    let overallsuccess = true;

    async.each(req.body.candidates, (candidate) => {
        ShareFolder.changePermission(req.body, candidate, (result) => {
            itemcounter++;
            let msg = {};
            msg.username = candidate.username;
            msg.success = result.success;
            if (!result.success) {
                overallsuccess = false;
                msg.error = result.error;
            }
            response.push(msg);
            if (itemcounter === req.body.candidates.length) {
                response.push({overallsuccess:overallsuccess});
                res.send(JSON.stringify(response));
            }
        });
    });
});
module.exports = router;