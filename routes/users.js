import {DBHandler} from '../utils/db_util';
import express from 'express';
var router = express.Router();
var ldap = require('ldapjs');

const ldapClient = ldap.createClient({
    url: 'ldap://127.0.0.1:1389'
});

router.post('/sign-in', function(req, res, next) {
   res.set('Content-Type', 'application/json');

    let result ={};
    let username = req.body.username ;
    let password = req.body.password ;


    ldapClient.bind(`cn=${username}`, `${password}`, function (err) {
        if (err) {
            console.log('Binding error ', err);
            result['success']= false;
        }else{
            console.log('success');
            result['success']= true;
            result['password']= process.env.SMBPASSWD;
            result['user']= process.env.SMBUSER;
            result['sharename']= username;
        }
        res.send(JSON.stringify(result));
    });
});

module.exports = router;