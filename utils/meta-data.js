/**
 * Created by pamoda on 8/7/17.
 */
import fs  from 'fs';
import path from 'path';
import md5File from 'md5-file';

export function getFileList(directory) {
    let files = fs.readdirSync(directory);
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
    return {
        path: path,
        owner: stat["uid"],
        share_with: "all",
        size: stat["size"],
        last_modified: stat["mtime"],
        new_cs: hash
    };
}


