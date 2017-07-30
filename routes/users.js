import { DBHandler } from '../utils/db_util';
import express from 'express';
import sha256 from 'sha256';

const router = express.Router();
const dbh = new DBHandler();

router.post('/signin', function (req, res, next) {
    const userData = {
        username: req.body.username,
        password: sha256(req.body.password)
    };

    let result = { success: false };

    // Obtain user
    dbh.searchUser(userData.username).exec((err, doc) => {
        // Check hash
        if (doc.password === userData.password) {
            result.success = true;
            result['user'] = process.env.SMBUSER,
            result['password'] = process.env.SMBPASSWD,
            result['sharename'] = userData.username
        }
        res.set('Content-Type', 'application/json');
        res.send(result);
    });
});

router.post('/signup', function (req, res, next) {
    let data = req.body.data;
    
    const userData = {
        username: data.username,
        password: sha256(data.password),
        firstname: data.firstname,
        lastname: data.lastname
    }; 

    let result = { success: false };

    dbh.addUser(userData, (result) => {
        res.set('Content-Type', 'application/json');
        res.send(result);
    });

});

module.exports = router;