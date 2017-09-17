/**
 * @author Dulaj Atapattu
 */
import * as databases from './dbs';
import * as _ from 'lodash'

export default class ChecksumDBHandler {

    static async setChecksum(path, checksum) {
        let result = {success: false};

        await new Promise((resolve) => {
            databases.checkSumDB.update({path: path}, {
                path: path,
                synced_cs: checksum
            }, {upsert: true}, function (err, numReplaced) {
                if (err) {
                    this.handleError(result, 'Database error. Setting checksum failed', err);
                } else {
                    result.success = true;
                }
                resolve(result);
            })
        });
    }

    static getChecksum(path) {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.checkSumDB.findOne({path: path}, (err, doc) => {
                if (err) {
                    this.handleError(result, 'Database error. Cannot read checksum', err);
                } else {
                    result.success = true;
                    result.data = doc ? doc.synced_cs : '';
                }

                resolve(result);
            });
        });
    }

    static handleError(result, msg, err) {
        if (arguments.length === 2) {
            console.error(msg);
        } else {
            console.error(msg);
        }
        result.error = msg;
    }

    static updateFilePathsAfterRename(oldPath, newPath) {
        // TODO: Warning: This regex is not working with spaces
        const regex = new RegExp(oldPath);
        console.log(regex);

        databases.checkSumDB.find({path: {$regex: regex}}, (err, docs) => {
            console.log('docs', docs);
            _.each(docs, (doc) => {
                const oldFilePath = doc.path;
                const newFilePath = _.replace(oldFilePath, oldPath, newPath);
                databases.checkSumDB.update({path: oldFilePath}, {$set: {path: newFilePath}}, {}, (err, numReplaced) => {
                });
            });
        });
    }

}