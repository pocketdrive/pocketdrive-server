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
            item['permission'] = 'rw';		// this value should be read from db
            item['children'] = (exports.allFilesFolders(dir + file + '/'));
            items.push(item);
        }
        else {
            var item={};
            item['type'] = 'file';
            item['name'] = file;
            item['path'] = dir + file;
            item['permission'] = 'rw';		// this value should be read from db
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
            item['permission'] = 'rw';		// this value should be read from db
            item['children'] = (exports.allFolders(dir + file + '/'));
            items.push(item);
        }
    });
    return items;
};
