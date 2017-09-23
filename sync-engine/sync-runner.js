import * as _ from 'lodash';

import SyncDbHandler from '../db/sync-db';
import FileSystemEventListener from './file-system-event-listener';
import SyncCommunicator from '../communicator/sync-communicator';

/**
 * @author Dulaj Atapattu
 */
export class SyncRunner {

    static eventListeners = {};

    static onPdStart() {

        SyncDbHandler.getAllSyncingUsers().then((users) => {
            _.each(users.data, (user) => {
                _.each(user.syncFolders, (folderName) => {
                    SyncRunner.onAddNewSyncDirectory(user.username, folderName);
                });
            });
        });

        // Create the server socket
        SyncRunner.communicator = new SyncCommunicator();
    }

    static onPdStop() {

    }

    static onClientConnect(username) {

    }

    static onClientDisconnect(username) {

    }

    static onAddNewSyncDirectory(username, folderName, deviceIds) {
        if (!SyncRunner.eventListeners[username]) {
            SyncRunner.eventListeners[username] = {};
            SyncRunner.eventListeners[username].timeOutId = 0;
            SyncRunner.eventListeners[username].isWatcherRunning = false;
        }

        SyncRunner.eventListeners[username][folderName] = new FileSystemEventListener(username, folderName, deviceIds);
        SyncRunner.eventListeners[username][folderName].start();
    }

}