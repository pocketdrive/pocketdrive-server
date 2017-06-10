const conf = require('../conf');
const express = require('express');
const router = express.Router();
const utils = require('../utils/utils');

router.get('/', function (req, res, next) {
    res.writeHead(200, {'Content-Type': 'application/json'});

    let folderpath = conf.rootfolder + '/' + req.query.username;

    let dirs = utils.allFolders(folderpath);
    res.end(JSON.stringify(dirs));
});

module.exports = router;