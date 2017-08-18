/**
 * Created by anuradhawick on 8/7/17.
 */
import * as _ from 'lodash';
import fs from 'fs';
import path from 'path';

let results = [];

export function getAllFilePaths(username, dirArray) {
    let resultArray = [];

    _.each(dirArray, (dir) => {
        if (fs.statSync(dir).isDirectory()) {
            results.push(dir);
            _walkFilePath(dir);
            resultArray.push(results);
            results = [];
        }
    });

    return resultArray;
}

function _walkFilePath(dir) {
    let fileList = fs.readdirSync(dir);

    _.each(fileList, (file) => {
        if (file[0] === '.') {
            return;
        }
        file = path.resolve(dir, file);
        if (fs.statSync(file).isDirectory()) {
            _walkFilePath(file);
        } else {
            results.push(file);
        }
    });

    return results;
}

export function isFileUpdated(filePath) {

}

export function hasFile(username, filePath) {
    // TODO : construct the filepath using username and env file
    return !!fs.existsSync(filePath);
}