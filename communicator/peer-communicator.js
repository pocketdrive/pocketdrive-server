/**
 * Created by anuradhawick on 7/28/17.
 */
import fs from 'fs';

import * as pm from './peer-messages';

export default class PeerCommunicator {
    peerObject;

    constructor(peerObj) {
        this.peerObject = peerObj;
        this.initCommunication();
    }

    async initCommunication() {
        // wait for connection
        this.peerObject.receiveBuffer(this.handlePeerMessage());
    }

    async waitForConnection() {
        let attemptCount = 0;
        return await new Promise(resolve => {
            const int = setInterval(() => {
                if (this.peerObjec.isConnected()) {
                    resolve(true);
                    clearInterval(int);
                } else if (attemptCount === 10) {
                    resolve(false);
                    clearInterval(int);
                }
                attemptCount++;
            }, 500);
        });
    }

    handlePeerMessage() {
        const localThis = this;

        // Performing context binding for the callback
        return function(messageBuffer, messageInfo) {
            if (messageInfo.type === 'json') {
                let obj = JSON.parse(messageBuffer.toString());
                switch (obj.type) {
                    case pm.linkShare:
                        localThis.sendLinkedFile(obj.fileId);
                        break;
                }
            } else {

            }
        }

    }

    async sendLinkedFile(fileId) {
        // TODO hard coded for the moment, needs to read a db and get the file path
        const file = fs.readFileSync('/Users/anuradhawick/Desktop/ltu-raf.avi');
        await this.messageToPeer(file, 'file', {fileName: 'sample file name'});
    }

    async messageToPeer(buffer, type, data) {
        if (!this.peerObject.isConnected()) {
            await this.waitForConnection();
        }
        this.peerObject.sendBuffer(buffer, type, data);
    }
}

/**
 * Peer message format
 * {
 *      info: {
 *          size: 123
 *          },
 *      type: one of [file, json, string]
 *      data: some user define JSON
 * }
 *
 * link request object format
 * { type: "linkShare", fileId: "asd7asd8fas23asd423sdd" }
 * */