const conf = require('../conf');
var express = require('express');
var router = express.Router();
let exec = require('child_process').exec;

router.post('/', function(req, res, next) {
    res.writeHead(200, {'Content-Type': 'application/json'});

    // replace this with ldap code
    console.log("/share-folder");
    console.log(conf.rootfolder);

    let result = {'success':false};

    let username_from = req.body.username_from;
    let username_to = req.body.username_to;
    let path = req.body.path;
    let folder_name = req.body.folder_name;
    let permission = req.body.permission;

    //TODO: do a username_to validation here with ldap

    permission = (permission == 'r') ? '-r' : '';
    let src = conf.rootfolder + '/' + username_from + '/' + path;
    let dest = conf.rootfolder + '/' + username_to + '/' + folder_name;

    let createDirCmd = 'mkdir ' + dest;
    let mountCmd = 'sudo mount ' + src + ' ' + dest + ' --bind ' + permission;

    //TODO: update the database about sharing activity

    console.log(createDirCmd);
    exec(createDirCmd, function(error, stdout, stderr){
        if(error){
            result['success'] = false;
            res.end(JSON.stringify(result));
        } else{
            console.log(mountCmd);
            exec(mountCmd, function(error, stdout, stderr) {
                if(error){
                    result['success'] = false;
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