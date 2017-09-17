import * as _ from 'lodash';

import SyncDbHandler from '../db/sync-db';
import FileSystemEventListener from './file-system-event-listener';
import SyncCommunicator from '../communicator/sync-communicator';

/**
 * @author Dulaj Atapattu
 */
export class SyncRunner {

    eventListeners = {};

    onPdStart() {
        // Create the server socket
        this.communicator = new SyncCommunicator();

        SyncDbHandler.getAllSyncingUsers().then((users) => {
            _.each(users.data, (user) => {
                _.each(user.syncFolders, (folderName) => {
                    this.onAddNewSyncDirectory(user.username, folderName);
                });
            });
        });
    }

    onPdStop() {
        /*_.each(this.eventListeners, (user) => {
            _.each(user, (listener) => {
                listener.stop();
            });
        });

        this.eventListeners = {};*/
    }

    onClientConnect(username) {

    }

    onClientDisconnect(username) {

    }

    /*scanMetadataDBForChanges(username){
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
    }*/

    onAddNewSyncDirectory(username, folderName, deviceIds) {
        if (!this.eventListeners[username]) {
            this.eventListeners[username] = {};
        }

        this.eventListeners[username][folderName] = new FileSystemEventListener(username, folderName, deviceIds);
        this.eventListeners[username][folderName].start();
    }
}