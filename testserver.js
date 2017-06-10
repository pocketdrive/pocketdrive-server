/**
 * Created by anuradhawick on 6/9/17.
 */
var ldap = require('ldapjs');
const ldapClient = ldap.createClient({
    url: 'ldap://127.0.0.1:1389'
});

const opts = {
    // filter: `(cn=${req.body.username})`,
    scope: 'sub'
};

console.log('Here');
ldapClient.search('ou=users,o=PD', opts, function(err, res) {

    res.on('searchEntry', function(entry) {
        console.log('entry: ' + JSON.stringify(entry.object));
    });
    res.on('searchReference', function(referral) {
        console.log('referral: ' + referral.uris.join());
    });
    res.on('error', function(err) {
        console.error('error: ' + err.message);
    });
    res.on('end', function(result) {
        console.log('status: ' + result.status);
    });
});