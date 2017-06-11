import {DBHandler} from '../utils/db_util';
import express from 'express';
import sha256 from 'sha256';

const router = express.Router();
const dbh = new DBHandler();

router.post('/sign-in', function (req, res, next) {
    const userData = {
        username: req.body.username,
        password: sha256(req.body.password)
    };
    let result = {
        success: false
    };

    // Obtain user
    dbh.searchUser(userData.username).exec((err, doc) => {
        // Check hash
        if (doc.password === userData.password) {
            result.success = true;
        }
        res.set('Content-Type', 'application/json');
        res.send(result);
    });
});

module.exports = router;