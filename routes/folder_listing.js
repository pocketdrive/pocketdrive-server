const express = require('express');
const router = express.Router();
const utils = require('../utils/utils');
console.log(process.env.ROOT);
router.get('/', function (req, res, next) {
    res.writeHead(200, {'Content-Type': 'application/json'});

    let folderpath = process.env.ROOT+ '/' + req.query.username;

    let dirs = utils.allFolders(folderpath);
    res.end(JSON.stringify(dirs));
});

module.exports = router;