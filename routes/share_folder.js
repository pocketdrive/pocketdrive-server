import express from 'express';
import ShareFolder from "../share-folder-backend/share-folder";
import * as async from 'async';

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

    let response = [];
    let itemCounter = 0;
    let overallSuccess = true;

    async.each(req.body.candidates, (candidate) => {
        ShareFolder.share(req.body, candidate, (result) => {
            itemCounter++;
            if (!result.success) {
                let msg ={};
                overallSuccess = false;
                msg.username = candidate.username;
                msg.error = result.error;
                response.push(msg);
            }

            if (itemCounter === req.body.candidates.length) {
                let finalResult={
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

    console.log("/share-folder/unshare")
    let response = [];
    let itemcounter = 0;
    let overallsuccess = true;

    async.each(req.body.candidates, (candidate) => {
        ShareFolder.unshare(req.body, candidate, (result) => {
            itemcounter++;
            if (!result.success) {
                let msg ={};
                overallsuccess = false;
                msg.username = candidate;
                msg.error = result.error;
                response.push(msg);
            }
            if (itemcounter === req.body.candidates.length) {
                let finalresult={
                    "success": overallsuccess,
                    "msg": response
                }
                res.send(JSON.stringify(finalresult));
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

            if (!result.success) {
                let msg ={};
                overallsuccess = false;
                msg.username = candidate.username;
                msg.error = result.error;
                response.push(msg);
            }
            if (itemcounter === req.body.candidates.length) {
                let finalresult={
                    "success": overallsuccess,
                    "msg": response
                }
                res.send(JSON.stringify(finalresult));
            }
        });
    });
});
module.exports = router;