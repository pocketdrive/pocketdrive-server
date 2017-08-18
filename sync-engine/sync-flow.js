/**
 * Created by anuradhawick on 7/28/17.
 */
import * as _ from 'lodash';

import MetadataDBHandler from '../db/file-metadata-db';
import SyncDbHandler from '../db/sync-db';
import FileSystemEventListener from '../sync-engine/file-system-event-listener';

class SyncFlow {
    eventListeners = [];
    metaDbHandler = new MetadataDBHandler();
    syncDbHandler = new SyncDbHandler();

    constructor() {
        // read db and register sync folders for event listener
    }

    registerFilesForSync(username, folderName) {
        // add files to watcher
        this.metaDbHandler.addFilesToSync(username, folderName);
        // add to listeners
        this.eventListeners.push(new FileSystemEventListener(username, folderName));
    }

    restartEngine() {
        this.eventListeners = [];
        // read db and register sync folders for event listener
        const usersPromise = this.syncDbHandler.getAllSyncingUsers();

        usersPromise.then((users) => {
            _.each(users.data, (user) => {
                _.each(user.syncFolders, (folderName) => {
                    // TODO initiate the sync engine again
                });
            });
        });
    }

}

export const sync = new SyncFlow();