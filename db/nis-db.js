/**
 * @author Dulaj Atapattu
 */
import * as databases from './dbs';

export default class NisDbHandler {

    static setSyncFolders(username, deviceIds, folderNames) {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.nisDb.update({username: username, deviceId: deviceIds}, {
                username: username,
                deviceId: deviceIds,
                syncFolders: folderNames
            }, {upsert: true}, function (err, numReplaced) {
                if (err) {
                    console.error('Database error. Adding new user failed', err);
                    result['error'] = 'Database error. Adding new user failed';
                } else {
                    result.success = true;
                }
                resolve(result);
            })
        });
    }

    static getSyncFolders(username) {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.nisDb.findOne({username: username}, (err, doc) => {
                if (err) {
                    this.handleError(result, 'Database error. Cannot read sync folders', err);
                } else {
                    result.success = true;
                    result.data = doc ? doc.syncFolders : {};
                }

                resolve(result);
            });
        });
    }

    static getAllSyncingUsers() {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.nisDb.find({}, (err, doc) => {
                if (err) {
                    this.handleError(result, 'Database error. Read all failed.', err);
                    resolve(result);
                } else {
                    result.success = true;
                    result.data = doc ? doc : {};
                    resolve(result);
                }
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