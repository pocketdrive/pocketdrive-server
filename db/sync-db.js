/**
 * @author dulajra
 */
import * as databases from './dbs';

export default class SyncDbHandler {

    setSyncFolders(username, folderNames) {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.syncDb.update({username: username}, {$set: {syncFolders: folderNames}}, {upsert: true}, function (err, numReplaced) {
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

    getSyncFolders(username) {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.syncDb.findOne({username: username}, (err, doc) => {
                if (err) {
                    this.handleError(result, 'Database error. Cannot read sync folders', err);
                } else {
                    result.success = true;

                    if(doc){
                        result.data = doc.syncFolders;
                    } else{
                        result.data = {}
                    }
                }

                resolve(result);
            });
        });
    }

    getAllSyncingUsers() {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.syncDb.find({},(err, doc) => {
                if (err) {
                    this.handleError(result, 'Database error. Find users failed', err);
                    resolve(result);
                } else if (doc !== null) {
                    result.success = true;
                    result.data = doc;
                    resolve(result);
                }
            });
        });
    }

    handleError(result, msg, err) {
        if (arguments.length === 2) {
            console.error(msg);
        } else {
            console.error(msg);
        }
        result.error = msg;
    }

}
