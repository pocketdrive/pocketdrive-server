import * as _ from 'lodash';

import MetadataDBHandler from '../db/file-metadata-db';
import SyncDbHandler from '../db/sync-db';
import FileSystemEventListener from '../sync-engine/file-system-event-listener';

/**
 * @author Dulaj Atapattu
 */
export class SyncRunner {

    eventListeners = {};
    metaDbHandler = new MetadataDBHandler();
    syncDbHandler = new SyncDbHandler();

    onPdStart() {
        this.syncDbHandler.getAllSyncingUsers().then((users) => {
            _.each(users.data, (user) => {
                this.eventListeners[user.username] = [];

                _.each(user.syncFolders, (folderName) => {
                    this.eventListeners[user.username].push(new FileSystemEventListener(user.username, folderName).start());
                });
            });
        });
    }

    onPdStop() {
        _.each(this.eventListeners, (user) => {
            _.each(user, (listener) => {
                listener.stop();
            });
        });

        this.eventListeners = {};
    }

    onClientConnect(username) {

    }

    onClientDisconnect(username) {

    }

    onAddNewSyncDirectory(username, folderName) {
        this.metaDbHandler.addFilesToSync(username, folderName);
        this.eventListeners.push(new FileSystemEventListener(username, folderName).start());
    }
}