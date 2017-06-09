const express = require('express');
const router = express.Router();
const utils = require('../utils/utils');

router.get('/', function (req, res, next) {
    res.writeHead(200, {'Content-Type': 'application/json'});

    let user = req.query.username;
    let folderpath;

// get the folder path from ldap db
    if(user === "dulaj"){
        folderpath = "/home/dulaj/dulaj/";
    } else if(user === "anuradha"){
        folderpath = "/home/dulaj/anuradha";
    }
// end

    let dirs = utils.allFolders(folderpath);
    res.end(JSON.stringify(dirs));
});

module.exports = router;