/**
 * Created by pamoda on 8/7/17.
 */
import fs  from 'fs';
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

export function getFileMetadata(path) {
    const stat = fs.statSync(path);
    const hash = md5File.sync(path);
    const tempPath = _.replace(path, process.env.PD_FOLDER_PATH, '');

    return {
        path: tempPath,
        owner: stat["uid"],
        share_with: "all",
        size: stat["size"],
        last_modified: stat["mtime"],
        new_cs: hash
    };
}


