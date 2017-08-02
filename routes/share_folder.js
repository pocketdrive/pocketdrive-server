import { UserDbHandler } from '../db/user-db';

const utils = require('../utils/file');
var express = require('express');
let exec = require('child_process').exec;

var router = express.Router();
const dbh = new UserDbHandler();

router.post('/', function(req, res, next) {
    res.set('Content-Type', 'application/json');

    console.log("/share-folder");

    let result = {'success':false};

    let username_from = req.body.username_from;
    let username_to = req.body.username_to;
    let path = req.body.path;
    let folder_name = req.body.folder_name;
    let permission = req.body.permission;

    //TODO: do a username_to validation here

    let rw = (permission == 'r') ? '-r' : '';
    let src = path;
    let dest = process.env.ROOT_FOLDER + '/' + username_to + '/' + process.env.SHARED_FOLDER_NAME + '/' + username_from;

    let createDirCmd = 'mkdir -p ' + '\"' + `${dest}` + '\"';

    console.log(createDirCmd);
    exec(createDirCmd, function(error, stdout, stderr){
        if(error){
            result['success'] = false;
            result['error'] = 'Creating shared folder for user failed';
            console.error('Creating shared folder for user failed');
            console.error(error);
            res.end(JSON.stringify(result));
        } else{
            dest = dest + '/' + utils.getAvailableName(dest, folder_name);
            createDirCmd = 'mkdir ' + '\"' + `${dest}` + '\"';

            console.log(createDirCmd);
            exec(createDirCmd, function(error, stdout, stderr){
                if(error){
                    result['success'] = false;
                    result['error'] = 'Creating shared folder failed';
                    console.error('Creating shared folder failed');
                    console.error(error);
                    res.end(JSON.stringify(result));
                } else{
                    let mountCmd = 'sudo mount \"' + `${src}` + '\" \"' + `${dest}` + '\" --bind ' + rw;

                    console.log(mountCmd);
                    exec(mountCmd, function(error, stdout, stderr) {
                        if(error){
                            result['success'] = false;
                            result['error'] = 'Mounting shared folder failed';
                            console.error('Mounting shared folder failed');
                            console.error(error);
                            res.end(JSON.stringify(result));
                        } else{
                            result['success'] = true;

                            // Updating the database about the sharing activity
                            let dataToSave = {
                                owner:username_from,
                                candidate:username_to,
                                src_path:src,
                                dest_path:dest,
                                permission:permission
                            };

                            dbh.shareFolder(dataToSave);

                            res.end(JSON.stringify(result));
                        }
                    });
                }
            });
        }
    });

});

module.exports = router;