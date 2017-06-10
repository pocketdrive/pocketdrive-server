var express = require('express');
var router = express.Router();
var ldap = require('ldapjs');

// /* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('r

const ldapClient = ldap.createClient({
    url: 'ldap://127.0.0.1:1389'
});

router.post('/sign-in', function(req, res, next) {
   // res.writeHead(200, {'Content-Type': 'application/json'});

    let username = req.body.username ;
    let password = req.body.password ;


    ldapClient.bind(`cn=${username}`, `${password}`, function (err) {
        if (err) {
            console.log('Binding error ', err);
        }else{
            console.log('success');
        }
    });


    // ###########################

    let result = {"user": "dulaj", "password": "1234"};
    //
    // if(req.body.username === 'dulaj' && req.body.password === "1"){
    //     result["sharename"] = "dulaj";
    //     result["success"] = true;
    // } else if(req.body.username === 'anuradha' && req.body.password === "2"){
    //     result["sharename"] = "anuradha";
    //     result["success"] = true;
    // } else {
    //     result = {"success":false};
    // }
    //

    res.send(JSON.stringify(result));
    // next();
});

module.exports = router;
