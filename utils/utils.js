let fs = require('fs');

exports.allFilesFolders = function(dir) {
    var items = [];
    if(dir[dir.length-1] != '/') dir=dir.concat('/')
    files = fs.readdirSync(dir);

    files.forEach(function(file) {
        if (fs.statSync(dir + file).isDirectory()) {
            var item = {};
            item['type'] = 'dir';
            item['name'] = file;
            item['path'] = dir + file
            item['permission'] = 'w';		//TODO: this value should be read from db. Hint: Maintain a hash for all shared folders in a key value db. key is folder path. vakue is permission. do same for owner attribute. another approach is /etc/mtab file.
            item['owner'] = 'me';      //TODO: this value should be read from db
            item['children'] = (exports.allFilesFolders(dir + file + '/'));
            items.push(item);
        }
        else {
            var item={};
            item['type'] = 'file';
            item['name'] = file;
            item['path'] = dir + file;
            item['permission'] = 'w';		//TODO: this value should be read from db
            items.push(item);
        }
    });
    return items;
};

exports.allFolders = function(dir) {
    var items = [];
    if(dir[dir.length-1] != '/') dir=dir.concat('/')
    files = fs.readdirSync(dir);

    files.forEach(function(file) {
        if (fs.statSync(dir + file).isDirectory()) {
            var item = {};
            item['type'] = 'dir';
            item['name'] = file;
            item['path'] = dir + file
            item['permission'] = 'w';		//TODO: this value should be read from db
            item['owner'] = 'me';      //TODO: this value should be read from db
            item['children'] = (exports.allFolders(dir + file + '/'));
            items.push(item);
        }
    });
    return items;
};
