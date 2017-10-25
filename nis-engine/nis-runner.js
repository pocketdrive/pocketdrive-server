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

        new NisCommunicator();

        NisDbHandler.getAllEntries().then((users) => {
            _.each(users.data, (user) => {
                _.each(user.syncFolders, (folder) => {
                    new NisEventListener(user.username, folder.name, folder.syncDevices[0]).start();
                });
            });
        });
    }

    static onPdStop() {

    }

}