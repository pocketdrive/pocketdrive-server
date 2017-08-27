import * as _ from 'lodash';

import MetadataDBHandler from '../db/file-metadata-db';
import SyncDbHandler from '../db/sync-db';
import FileSystemEventListener from '../sync-engine/file-system-event-listener';

/**
 * @author Dulaj Atapattu
 */
export class SyncRunner {

    eventListeners = {};
    metaDbHandler = MetadataDBHandler.instance;
    syncDbHandler = SyncDbHandler.instance;

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

    scanMetadataDBForChanges(username){
        MetadataDBHandler.getUpdatedFilesOfUser(username).then((updates) => {
            _.each(updates, (update) => {
                switch (update.action){
                    case SyncEvents.NEW:
                        break;
                    case SyncEvents.MODIFY:
                        break;
                    case SyncEvents.RENAME:
                        break;
                    case SyncEvents.DELETE:
                        break;
                }

            })
        })
    }

    onAddNewSyncDirectory(username, folderName) {
        // TODO: Rethink about this.
        // this.metaDbHandler.addNewFolder(username, folderName);
        if(!this.eventListeners[username]){
            this.eventListeners[username] = [];
        }

        this.eventListeners[username].push(new FileSystemEventListener(username, folderName).start());
    }
}