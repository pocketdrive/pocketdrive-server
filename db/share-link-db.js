/**
 * Created by anuradhawick on 8/2/17.
 */
import uuid from 'uuid/v4';
import * as _ from 'lodash';

import * as databases from './dbs';

const sampleLink = {fileId: '', filePath: '', username: ''};

export default class ShareLinkDbHandler {
    username;
    filePath;
    fileId;

    constructor(username = null, path = null) {
        this.username = username;
        this.filePath = path;
        this.fileId = uuid().toString(); // generate UUID for the file
    }

    shareFile() {
        if (_.isEmpty(this.username) || _.isEmpty(this.filePath)) {
            return new Promise((resolve) => {
                databases.linkShareDb.insert(link, (err, doc) => {
                    resolve(null);
                });
            });
        }
        let link = _.cloneDeep(sampleLink);

        link.fileId = this.fileId;
        link.filePath = this.filePath;
        link.username = this.username;

        return new Promise((resolve, reject) => {
            // check if file already shared
            databases.linkShareDb.findOne({username: this.username, filePath: this.filePath}, (err, doc) => {
                if (err) {
                    reject(err);
                } else {
                    if (doc !== null) {
                        console.log('already exist');
                        resolve(doc.fileId);
                    } else {
                        console.log('inserting new');
                        databases.linkShareDb.insert(link, (err, doc) => {
                            resolve(doc.fileId);
                        });
                    }
                }
            });
        });
    }

    findPath(username, fileId) {
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