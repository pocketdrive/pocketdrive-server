const utils = require('../utils/utils');
var express = require('express');
var router = express.Router();
let exec = require('child_process').exec;

router.post('/', function(req, res, next) {
    res.set('Content-Type', 'application/json');

    // replace this with ldap code
    console.log("/share-folder");

    let result = {'success':false};

    let username_from = req.body.username_from;
    let username_to = req.body.username_to;
    let path = req.body.path;
    let folder_name = req.body.folder_name;
    let permission = req.body.permission;

    //TODO: do a username_to validation here with ldap

    permission = (permission == 'r') ? '-r' : '';
    let src = path;
    let dest = process.env.ROOT_FOLDER + '/' + username_to + '/' + process.env.SHARED_FOLDER_NAME + '/' + username_from;
    dest = '/' + utils.getAvailableName(dest, folder_name);

    let createDirCmd = 'mkdir ' + `${dest}`;
    let mountCmd = 'sudo mount ' + src + ' ' + dest + ' --bind ' + permission;

    //TODO: update the database about sharing activity

    console.log(createDirCmd);
    exec(createDirCmd, function(error, stdout, stderr){
        if(error){
            result['success'] = false;
            result['error'] = 'Creating shared folder failed';
            console.error('Creating shared folder failed');
            console.error(error);
            res.end(JSON.stringify(result));
        } else{
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
                    res.end(JSON.stringify(result));
                }
            });
        }
    });

});

module.exports = router;