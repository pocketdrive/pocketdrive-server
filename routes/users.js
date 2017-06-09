var express = require('express');
var router = express.Router();

// /* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });

router.post('sign-in', function(req, res, next) {
    res.writeHead(200, {'Content-Type': 'application/json'});

    // replace this with ldap code
    console.log("/signin");
    let result = {"user": "dulaj", "password": "1234"};

    if(req.body.username === 'dulaj' && req.body.password === "1"){
        result["sharename"] = "dulaj";
        result["success"] = true;
    } else if(req.body.username === 'anuradha' && req.body.password === "2"){
        result["sharename"] = "anuradha";
        result["success"] = true;
    } else {
        result = {"success":false};
    }

    res.end(JSON.stringify(result));
});

module.exports = router;
