/**
 * @author Dulaj Atapattu
 */

import {exec} from 'child_process';
import path from 'path';
import express from 'express';
import sha256 from 'sha256';
import * as jwt from 'jsonwebtoken';

import UserDbHandler from '../db/user-db';

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
                username: process.env.SMBUSER,
                password: process.env.SMBPASSWD
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

router.post('/signin/admin', function (req, res) {
    res.set('Content-Type', 'application/json');

    let userData = req.body.data;
    userData.password = sha256(userData.password);
    userData.username = 'root';

    dbh.searchUser(userData).then((result) => {
        res.send(result);
    });

});

router.post('/signup', function (req, res, next) {
    res.set('Content-Type', 'application/json');

    const userData = req.body.data;
    userData.password = sha256(userData.password);

    dbh.addUser(userData).then((result) => {
        const userPath = path.resolve(process.env.PD_FOLDER_PATH, userData.username);
        const createDirCmd = `mkdir -p ${userPath}`;

        if (result.success) {
            exec(createDirCmd, (error, stdout, stderr) => {
                if (error) {
                    res.send({success: false, error: error});
                } else {
                    const smbConfEditCmd = `printf "\\n[${userData.username}]\\npath = ${userPath}\\nvalid users = ${process.env.SMBUSER}\\nread only = no\\n" | sudo tee -a /etc/samba/smb.conf`;

                    exec(smbConfEditCmd, (error, stdout, stderr) => {
                        if (error) {
                            res.send({success: false, error: error});
                        } else {
                            const sambaRestartCmd = 'sudo service smbd restart';

                            exec(sambaRestartCmd, (error, stdout, stderr) => {
                                if (error) {
                                    res.send({success: false, error: error});
                                } else {
                                    res.send({success: true});
                                }
                            });
                        }
                    });
                }
            });
        } else {
            res.send(result);
        }
    });
});

module.exports = router;