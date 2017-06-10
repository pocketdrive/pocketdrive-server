const conf = require('../conf');
const utils = require('../utils/utils');
const express = require('express');
const router = express.Router();

router.get('/', function (req, res, next) {
   // res.writeHead(200, {'Content-Type': 'application/json'});

    let folderpath = conf.rootfolder + '/' + req.query.username;

    console.log(folderpath);

    let dirs = utils.allFolders(folderpath);
    res.end(JSON.stringify(dirs));
});

module.exports = router;