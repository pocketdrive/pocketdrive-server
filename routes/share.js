const fileUtils = require('../utils/file');
const express = require('express');
const router = express.Router();

import {CommonUtils} from '../utils/common';

router.get('/list', CommonUtils.authorize, function (req, res, next) {
    res.set('Content-Type', 'application/json');

    let folderpath = process.env.PD_FOLDER_PATH + req.username;

    let dirs = fileUtils.allFolders(folderpath);
    res.send(JSON.stringify(dirs));
});

module.exports = router;