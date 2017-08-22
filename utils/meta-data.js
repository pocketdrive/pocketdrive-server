/**
 * Created by pamoda on 8/7/17.
 */
import fs from 'fs';
import path from 'path';
import md5File from 'md5-file';
import * as _ from 'lodash';

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