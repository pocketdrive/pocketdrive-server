import { UserDbHandler   } from '../db/user-db';
import express from 'express';
import sha256 from 'sha256';
// import sudo from 'sudo-prompt';

const router = express.Router();
const dbh = new UserDbHandler();

router.post('/signin', function (req, res, next) {
    const userData = {
        username: req.body.username,
        password: sha256(req.body.password)
    };

    let result = { success: false };

    // Obtain user
    dbh.searchUser(userData.username).exec((err, doc) => {
        // Check hash
        if (doc != null && doc.password === userData.password) {
            result.success = true;
            result['data'] = {
                smbUser: process.env.SMBUSER,
                smbPassword: process.env.SMBPASSWD,
                path: process.env.PD_FOLDER_PATH + userData.username
            }
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

    dbh.addUser(userData).then((result) => {
        // TODO: create a new folder 
        res.set('Content-Type', 'application/json');
        res.send(result);
    });
});

module.exports = router;