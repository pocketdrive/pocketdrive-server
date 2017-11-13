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
        SyncRunner.communicator = new SyncCommunicator();
        SyncRunner.startSync();
    }

    static startSync() {
        console.log('Starting sync engine...');
        SyncDbHandler.getAllSyncingUsers().then((users) => {
            _.each(users.data, (user) => {
                _.each(user.syncFolders, (folderName) => {
                    SyncRunner.addSyncDirectory(user.username, folderName);
                });
            });
        });

    }

    static stopSync() {
        console.log('Stopping sync engine...');
        _.each(this.eventListeners, (obj) => {
            _.each(obj.listeners, (item) => {
                item.listener.stop();
            });
        });
    }

    static restartSyncEngine() {
        SyncRunner.stopSync();
        SyncRunner.startSync();
    }

    static addSyncDirectory(username, folderName) {
        if (!SyncRunner.eventListeners[username]) {
            SyncRunner.eventListeners[username] = {};
            SyncRunner.eventListeners[username].timeOutId = 0;
            SyncRunner.eventListeners[username].isWatcherRunning = false;
            SyncRunner.eventListeners[username].listeners = [];
        }

        let listener = new FileSystemEventListener(username, folderName, []);
        listener.start();

        SyncRunner.eventListeners[username].listeners.push({
            folderName: folderName,
            listener: listener
        }); // TODO: set device IDs here

    }

    static removeSyncDirectory(username, folderName) {
        SyncRunner.eventListeners[username].listeners[folderName].stop();
        delete SyncRunner.eventListeners[username].listeners[folderName];
    }

}