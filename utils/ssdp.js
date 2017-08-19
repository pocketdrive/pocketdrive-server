/**
 * @author Dulaj Atapattu
 */
exports.broadcast = function () {
    let SSDP = require('node-ssdp').Server
        , server = new SSDP({
        location: 'http://' + require('ip').address() + ':' + process.env.REST_SERVER_PORT + '/' + process.env.PD_NAME,
        sourcePort: 1900
    });

    server.addUSN('urn:schemas-upnp-org:device:PocketDrive');

    server.start();
    console.log("Starting PocketDrive REST Server on " + require('ip').address());

    process.on('exit', function () {
        server.stop()
    })
}