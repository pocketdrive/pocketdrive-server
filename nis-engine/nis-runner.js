import * as _ from 'lodash';

import NisCommunicator from '../communicator/nis-communicator';
import NisEventListener from './nis-event-listener';
import NisDbHandler from "../db/nis-db";

/**
 * @author Dulaj Atapattu
 */
export class NisRunner {

    static eventListeners = {};

    static onPdStart() {
        NisRunner.communicator = new NisCommunicator();
        NisRunner.startNis();
    }

    static startNis(){
        // console.log('Starting NIS service...');

        NisDbHandler.getAllEntries().then((users) => {
            _.each(users.data, (user) => {
                _.each(user.syncFolders, (folder) => {
                    NisRunner.addNisDirectory(user, folder);
                });
            });
        });
    }

    static stopNis(){
        // console.log('Stopping NIS service...');

        _.each(this.eventListeners, (obj) => {
            _.each(obj.listeners, (item) => {
                item.listener.stop();
            });
        });
    }

    static restartNis(){
        console.log('Restarting NIS service...');
        NisRunner.stopNis();
        NisRunner.startNis();
    }

    static addNisDirectory(user, folder) {
        if (!NisRunner.eventListeners[user.username]) {
            NisRunner.eventListeners[user.username] = {};
            NisRunner.eventListeners[user.username].listeners = [];
        }

        let listener = new NisEventListener(user.username, folder.name, folder.syncDevices[0]);
        listener.start();

        NisRunner.eventListeners[user.username].listeners.push({
            folderName: folder.folderName,
            listener: listener
        });

    }

}