/**
 * Created by anuradhawick on 6/10/17.
 */
import DataStore from 'nedb';

import * as databases from './dbs';

export class SyncDbHandler {

    setSyncFolders(username, folderNames) {
        let result = { success: false };

        return new Promise((resolve) => {
            databases.userDb.update({username:username}, { $set: { syncFolders: folderNames }}, {}, function(err, numReplaced){
                if(err){
                    console.error('Database error. Adding new user failed', err);
                    result['error'] = 'Database error. Adding new user failed';
                } else {
                    console.log(numReplaced);
                    result.success = true;
                }
                resolve(result);
            })
        });
    }

    getSyncFolders(username) {
        return db.findOne({username: username});
    }

}
