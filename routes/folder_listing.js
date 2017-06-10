const utils = require('../utils/utils');
const express = require('express');
const router = express.Router();

router.get('/', function (req, res, next) {
   	res.set('Content-Type', 'application/json');

    let folderpath = process.env.ROOT_FOLDER + '/' + req.query.username;

    console.log(folderpath);

    let dirs = utils.allFolders(folderpath);
    res.end(JSON.stringify(dirs));
});

module.exports = router;