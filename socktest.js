import {Socket} from 'fast-tcp';
import * as _ from 'lodash';
import fs from 'fs';
import path from 'path';
import md5File from 'md5-file';

//./node_modules/.bin/babel-node --plugins transform-class-properties --presets es2015 ./socktest.js
const username = 'anuradha';
const clientSideTempPath = '/Users/anuradhawick/Documents/FYP-work/client-side-storage/';

async function main() {


    // TODO move to client side
    let sock = new Socket({
        host: 'localhost',
        port: 5000
    });
    const writeStream = sock.stream('message', {type: 'getSyncPaths'});

    sock.emit('message', {type: 'getSyncPaths', username: 'anuradha'});

    let newPaths = [];
    let pullPaths = [];
    let pushPaths = [];
    sock.on('message', (json) => {
        switch (json.type) {
            case 'syncPaths':
                console.log('Received Paths');
                _.each(json.paths, (data) => {
                    // data.path = path.resolve(clientSideTempPath, username, data.path);
                    // console.log(path.resolve(clientSideTempPath, username, data.path))
                    const filePath = path.resolve(clientSideTempPath, username, data.path);
                    if (!fs.existsSync(filePath)) {
                        // console.log(filePath)
                        newPaths.push(data.path[0] === '/' ? data.path.slice(1) : data.path);
                    } else {
                        // The file exists, check for hash match
                        if (data.md5 === md5File.sync(filePath)) {
                            console.log('Hash Match');
                        } else {
                            // if the file from pd is newer
                            if (data.mtimeMs > fs.statSync(filePath).mtimeMs) {

                            }
                            console.log('original: '+data.mtimeMs + ' client side: ' +fs.statSync(filePath).mtimeMs);
                        }
                    }
                });
                console.log('done');
                // start pulling each file from the PD
                _.each(newPaths, (fPath) => {
                    sock.emit('message', {type: 'requestFile', path: fPath, username: username});
                    createPath(path.resolve(clientSideTempPath, username, fPath))
                });
                // console.log(newPaths)
                break;
        }
    });

    sock.on('file', async (readStream, info) => {
        const fPath = path.resolve(clientSideTempPath, username, info.path);
        switch (info.type) {
            case 'newFile':
                createPath(fPath);
                console.log('writing to path: ' +fPath)
                const writeStream = fs.createWriteStream(fPath);
                readStream.pipe(writeStream);
                break;
        }
    });


}


function createPath(pathString) {
    const targetPath = path.dirname(pathString);
    const parts = targetPath.split('/');

    let tempPath = '/';

    _.remove(parts, (o) => o.length === 0);
    while (parts.length > 0) {
        tempPath = path.resolve(tempPath, parts.shift());
        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath);
        }
    }
}

main();