// import {Socket} from 'fast-tcp';
import * as _ from 'lodash';
import fs from 'fs';
import path from 'path';
import md5File from 'md5-file';

import {ChunkBasedSynchronizer} from './sync-engine/chunk-based-synchronizer';

//./node_modules/.bin/babel-node --plugins transform-class-properties --presets es2015 ./socktest.js
const username = 'anuradha';
const clientSideTempPath = '/Users/anuradhawick/Documents/FYP-work/client-side-storage/';

async function main() {
    const obj = await ChunkBasedSynchronizer.getChecksumOfChunks('/Users/anuradhawick/Documents/pocketdrive-server/test');
    console.log(obj)
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