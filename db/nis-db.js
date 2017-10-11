/**
 * @author Dulaj Atapattu
 */
import * as databases from './dbs';

export default class NisDbHandler {

    static setSyncFolders(username, clientId, syncFolders) {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.nisDb.update({username: username, clientId: clientId}, {
                username: username,
                clientId: clientId,
                syncFolders: syncFolders
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

    static getSyncFolders(username, clientId) {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.nisDb.findOne({username: username, clientId: clientId}, (err, doc) => {
                console.log("nis folders db entries: ", doc);
                if (err) {
                    this.handleError(result, 'Database error. Cannot read nis folders', err);
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