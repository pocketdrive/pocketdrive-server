/**
 * @author Dulaj Atapattu
 */
import * as databases from './dbs';

export default class ChecksumDBHandler {

    static setChecksum(path, checksum) {
        let result = {success: false};

        return new Promise((resolve) => {
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
            databases.syncDb.findOne({path: path}, (err, doc) => {
                if (err) {
                    this.handleError(result, 'Database error. Cannot read checksum', err);
                } else {
                    result.success = true;

                    //TODO: when doc = null '' or null?
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

}