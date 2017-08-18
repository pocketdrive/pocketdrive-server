import express from 'express';
import sha256 from 'sha256';
import * as jwt from 'jsonwebtoken';

import UserDbHandler from '../db/user-db';
// import sudo from 'sudo-prompt';

const router = express.Router();
const dbh = new UserDbHandler();

router.post('/signin', function (req, res) {
    res.set('Content-Type', 'application/json');

    let userData = req.body.data;
    userData.password = sha256(userData.password);

    dbh.searchUser(userData).then((result) => {
        if (!result.success) {
            res.send(result);
        } else {
            result.data.mount = {
                smbUser: process.env.SMBUSER,
                smbPassword: process.env.SMBPASSWD,
                path: process.env.PD_FOLDER_PATH + userData.username
            };

            result.token = jwt.sign(
                {
                    username: result.data.user.username
                },
                process.env.JWT_SECRET,
                {expiresIn: 3600 * 24 * 7}
            );
            res.send(result);
        }
    });

});

router.post('/signup', function (req, res, next) {
    res.set('Content-Type', 'application/json');

    let userData = req.body.data;
    userData.password = sha256(userData.password);

    dbh.addUser(userData).then((result) => {
        // TODO: create a new folder and add it to smb.conf

        res.send(result);
    });
});

module.exports = router;