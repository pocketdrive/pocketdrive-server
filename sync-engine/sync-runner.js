import * as _ from 'lodash';

import SyncDbHandler from '../db/sync-db';
import FileSystemEventListener from './file-system-event-listener';
import SyncCommunicator from '../communicator/sync-communicator';
import {ServerToPdSynchronizer} from "./server--to-pd-synchronizer";

/**
 * @author Dulaj Atapattu
 */
export class SyncRunner {

    static eventListeners = {};
    static serverToPdSynchronizers = {};

    static onPdStart() {
        // Create the server socket
        SyncRunner.communicator = new SyncCommunicator();

        SyncDbHandler.getAllSyncingUsers().then((users) => {
            _.each(users.data, (user) => {
                SyncRunner.serverToPdSynchronizers[user.username] = new ServerToPdSynchronizer(user.username, SyncRunner.communicator);

                _.each(user.syncFolders, (folderName) => {
                    SyncRunner.onAddNewSyncDirectory(user.username, folderName);
                });
            });
        });
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
        }

        SyncRunner.eventListeners[username][folderName] = new FileSystemEventListener(username, folderName, deviceIds);
        SyncRunner.eventListeners[username][folderName].start();
    }

    static startServerToPdSync(username){
        this.serverToPdSynchronizers[username].doSync();
    }

}