// const utils = require('../utils/utils');
const express = require('express');
const router = express.Router();
import * as fileUtils from '../utils/file';

router.post('/list', function (req, res, next) {
    let data = req.body.data;
    let folderpath = process.env.PD_FOLDER_PATH + data.username;

    fileUtils.firstLevelFolders(folderpath).then((result) => {
   	    res.set('Content-Type', 'application/json');
        res.send(result);    
    })

});

module.exports = router;