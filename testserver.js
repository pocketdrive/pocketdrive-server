/**
 * Created by anuradhawick on 6/9/17.
 */
var _ = require('lodash');
var fs = require('fs');

const dir = '/Users/anuradhawick';
const filename = 'Docs';
const files = fs.readdirSync(dir);
let similarStart = [];
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
    console.error(`Failed, performing last resort`);
    return `${filename}-${Date.now()}`;
}