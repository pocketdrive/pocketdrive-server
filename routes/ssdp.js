var SSDP = require('node-ssdp').Server
  , server = new SSDP({
    location: 'http://' + require('ip').address() + ':3000/' + 'home-pd',
    sourcePort: 1900
  });

server.addUSN('urn:schemas-upnp-org:device:PocketDrive');

server.start();
console.log("Starting PocketDrive on " + require('ip').address());

process.on('exit', function(){
    server.stop()
})