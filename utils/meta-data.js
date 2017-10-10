import fs from 'fs';
import path from 'path';
import md5File from 'md5-file';
import md5Dir from 'md5-dir';
import * as _ from 'lodash';
import crypto from 'crypto';

/**
 * @author Pamoda Wimalasiri
 * @author Anuradha Wickramarachchi
 */
export function getFileListByArray(directoryArray) {
    let results = [];
    _.each(directoryArray, (dir) => {
        results.push(...getFileList(dir));
    });
    return results;
}

export function getFileList(directory) {
    const files = fs.readdirSync(directory);

    let fileList = [];

    for (let i in files) {

        if (!files.hasOwnProperty(i))
            continue;
        let name = path.resolve(directory, files[i]);
        let stat = fs.statSync(name);

        if (stat.isDirectory()) {
            fileList = fileList.concat(getFileList(name));
        }
        else if (stat.isFile()) {
            fileList.push(name);
        }
    }

    return fileList;
}

export function getFileMetadata(username, fullPath) {

    return {
        path: _.replace(fullPath, process.env.PD_FOLDER_PATH, ''),
        user: username,
        action: 'NEW'
    };
}

export function getCheckSum(fullPath) {
    return md5File.sync(fullPath);
}

export function folderCheckSumSync(fullPath) {
    const files = fs.readdirSync(fullPath);
    const hashes = [];
    const hash = crypto.createHash('md5');

    files.forEach((file) => {
        const filepath = path.join(fullPath, file);
        const stat = fs.statSync(filepath);

        let hash;

        if (stat.isFile()) {
            hash = md5File.sync(filepath)
        } else if (stat.isDirectory()) {
            hash = folderCheckSumSync(filepath)
        } else {
            hash = null;
        }
        hashes.push(hash);
    });

    hashes.forEach((h) => {
        if (h !== null) hash.update(h)
    });

    return hash.digest('hex');
}