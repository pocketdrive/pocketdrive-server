import * as _ from 'lodash';
import MetadataDBHandler from "../db/file-metadata-db";

/**
 * @author Dulaj Atapattu
 */
export class ServerToPdSynchronizer {

    constructor(username, communicator){
        this.username = username;
        this.communicator = communicator;
        this.serializeLock = 0;
    }

    async doSync() {
        console.log('[SYNC]');
        this.serializeLock++;

        await MetadataDBHandler.getChangesOfUser(this.username).then(async (changes) => {
            changes = changes.data;
            let i = 0;
            let tryCount = 0;

            const intervalId = setInterval(async () => {
                if (this.serializeLock === 0) {
                    tryCount = 0;
                    if (i < changes.length) {
                        await this.communicator.sendSyncRequest(changes[i++]);
                    }
                    else {
                        clearInterval(intervalId);
                        this.serializeLock--;
                    }
                }
                else if (tryCount === 10) {
                    // this.communicator.serializeLock = 0;
                    // this.communicator.close();
                    // this.communicator = new SyncCommunicator(this.username, this.ip);
                    // i--;
                    // tryCount = 0;
                    console.log('Try count reached');
                }
                else {
                    tryCount++;
                    console.log('Retrying to sync: ' , tryCount);
                }

            }, 500);

        });
    }
}