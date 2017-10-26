var sudo = require('sudo');
var options = {
    cachePassword: true,
    prompt: 'Password, yo? ',
    spawnOptions: { /* other options for spawn */ }
};

const child = sudo(['ls', '-la'], options);

child.stdout.on('data', function (data) {
    console.log(data.toString());
});

child.stderr.on('data', function (error) {
    error = error.toString();
    console.log(error);
});

