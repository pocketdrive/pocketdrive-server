let fs = require('fs');
import * as _ from 'lodash';

exports.allFilesFolders = function (dir) {
    var items = [];
    if (dir[dir.length - 1] != '/') dir = dir.concat('/')
    files = fs.readdirSync(dir);

    files.forEach(function (file) {
        if (fs.statSync(dir + file).isDirectory()) {
            var item = {};
            item['type'] = 'dir';
            item['name'] = file;
            item['path'] = dir + file
            item['permission'] = 'w';       //TODO: this value should be read from db. Hint: Maintain a hash for all shared folders in a key value db. key is folder path. vakue is permission. do same for owner attribute. another approach is /etc/mtab file.
            item['owner'] = 'me';      //TODO: this value should be read from db
            item['children'] = (exports.allFilesFolders(dir + file + '/'));
            items.push(item);
        }
        else {
            var item = {};
            item['type'] = 'file';
            item['name'] = file;
            item['path'] = dir + file;
            item['permission'] = 'w';       //TODO: this value should be read from db
            items.push(item);
        }
    });
    return items;
};

exports.allFolders = function (dir) {
    var items = [];
    if (dir[dir.length - 1] != '/') dir = dir.concat('/')
    let files = fs.readdirSync(dir);

    files.forEach(function (file) {
        if (fs.statSync(dir + file).isDirectory()) {
            var item = {};
            item['type'] = 'dir';
            item['name'] = file;
            item['path'] = dir + file
            item['permission'] = 'w';       //TODO: this value should be read from db
            item['owner'] = 'me';      //TODO: this value should be read from db
            item['children'] = (exports.allFolders(dir + file + '/'));
            items.push(item);
        }
    });
    return items;
};

exports.getAvailableName = function (dir, filename) {
    const files = fs.readdirSync(dir);
    let similarStart = [];

    // For each file check if a directory and perform name test
    _.each(files, (file) => {
        if (fs.statSync(`${dir}/${file}`).isDirectory()) {
            // Get files with similar starting
            if (_.startsWith(file, filename)) {
                similarStart.push(file);
            }
        }

    });

    if (_.isEmpty(similarStart) || _.findIndex(similarStart, (obj) => _.isEqual(obj, filename)) === -1) {
        console.log(`File name possible ${filename}`);
        return filename;
    } else {
        let candidateName = filename;
        for (let i = 1; i <= 100; i++) {
            // Check if the new name is possible
            candidateName = `${filename}-${i}`;
            if (_.findIndex(similarStart, (obj) => _.isEqual(obj, candidateName)) === -1) {
                console.log(`Candidate name: ${candidateName}`);
                return candidateName;
            }
        }
        // If no possible filename is found, use timestamp
        console.error(`Failed, performing last resort`);
        return `${filename}-${Date.now()}`;
    }
};