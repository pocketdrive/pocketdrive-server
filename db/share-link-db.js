/**
 * Created by anuradhawick on 8/2/17.
 */
import DataStore from 'nedb';
import uuid from 'uuid/v4';
import * as _ from 'lodash';

import * as databases from './dbs';

const sampleLink = {fileId: '', filePath: '', username: ''};

export default class ShareLinkDbHandler {
    username;
    filePath;
    fileId;

    constructor(username, path) {
        this.username = username;
        this.filePath = path;

        // generate UUID for the file
        this.fileId = uuid().toString();
    }

    shareFile() {
        let link = _.cloneDeep(sampleLink);
        link.fileId = this.fileId;
        link.filePath = this.filePath;
        link.username = this.username;
        databases.linkShareDb.insert(link, (err, doc) => {
            // console.log(err, doc)
        });
        return true;
    }

    findLink(username, fileId) {
        return new Promise((resolve, reject) => {
            databases.linkShareDb.findOne({username: username, fileId: fileId}, (err, doc) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(doc);
                }
            });
        });
    }

}