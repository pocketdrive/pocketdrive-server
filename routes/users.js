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

router.post('/signup', function (req, res, next) {
    res.set('Content-Type', 'application/json');

    let userData = req.body.data;
    userData.password = sha256(userData.password);

    console.log(req.body.data);

    dbh.addUser(userData).then((result) => {
        const userPath = path.resolve(process.env.PD_FOLDER_PATH, userData.username);
        let createDirCmd = `mkdir -p ${userPath}`;

        if(result.success){
            exec(createDirCmd, function (error, stdout, stderr) {
                if(error){
                    res.send({success: false});
                } else{
                    res.send({success: true});
                }
            });
        } else{
            res.send(result);
        }
    });
});

module.exports = router;