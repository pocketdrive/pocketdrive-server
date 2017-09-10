/**
 * Created by anuradhawick on 7/28/17.
 */
import fs from 'fs';
import path from 'path';
import * as _ from 'lodash';
import archiver from 'archiver';
import uuid from 'uuid/v4';

import ShareLinkDbHandler from '../db/share-link-db';
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
        return function (messageBuffer, messageInfo) {
            if (messageInfo.type === 'json') {
                let obj = JSON.parse(messageBuffer.toString());
                switch (obj.type) {
                    case pm.linkShare:
                        if (obj.mode === 'linkShare') {
                            localThis.sendLinkedFile(obj.username, obj.fileId);
                        } else if (obj.mode === 'fileOpen') {
                            localThis.sendFileFromPath(obj.username, obj.path, obj.isMultiPath);
                        }
                        break;
                }
            } else {

            }
        }

    }

    async sendLinkedFile(username, fileId) {
        const dbh = new ShareLinkDbHandler();

        dbh.findPath(username, fileId).then(async (data) => {
            if (_.isEmpty(data)) {
                let msg = _.cloneDeep(pm.peerMessageError);

                msg.error = 'File could not be found';
                msg.message = 'Please check the link or contact file owner';
                this.messageToPeer(new Buffer(JSON.stringify(msg)), pm.type.json);
            } else {
                const file = fs.readFileSync(data.filePath);
                const fileName = path.basename(data.filePath);

                let msg = _.cloneDeep(pm.linkShareData);

                msg.fileName = fileName;
                this.messageToPeer(file, pm.type.file, msg);
            }
        });
    }

    async sendFileFromPath(username, file, isMulti) {
        let filePath;

        if (isMulti) {
            filePath = _.map(file, (fileName) => {
                return path.join(process.env.PD_FOLDER_PATH, username, fileName);
            });
            const tempName = `tmp-${uuid()}.zip`;
            const output = fs.createWriteStream(tempName);
            const archive = archiver('zip', {
                zlib: {level: 1} // Set for best speed compression for better UX
            });

            archive.on('error', (err) => {
                let msg = _.cloneDeep(pm.peerMessageError);

                msg.error = 'File could not be found';
                msg.message = 'Please try again later';
                this.messageToPeer(new Buffer(JSON.stringify(msg)), pm.type.json);
            });

            output.on('close', () => {
                let msg = _.cloneDeep(pm.linkShareData);

                msg.fileName = tempName;
                this.messageToPeer(fs.readFileSync(tempName), pm.type.file, msg, () => {
                    fs.unlinkSync(tempName)
                });
            });

            archive.pipe(output);

            _.each(filePath, (itemPath) => {
                archive.file(itemPath, {name: path.basename(itemPath)});
            });

            archive.finalize();
        } else {
            filePath = path.join(process.env.PD_FOLDER_PATH, username, file);

            try {
                let msg = _.cloneDeep(pm.linkShareData);
                msg.fileName = path.basename(file);


                this.messageToPeer(fs.readFileSync(filePath), pm.type.file, msg);
            } catch (e) {
                let msg = _.cloneDeep(pm.peerMessageError);

                msg.error = 'File could not be found';
                msg.message = 'Please try again later';
                this.messageToPeer(new Buffer(JSON.stringify(msg)), pm.type.json);
            }
        }
    }

    async messageToPeer(buffer, type, data, callback) {
        if (!this.peerObject.isConnected()) {
            await this.waitForConnection();
        }
        this.peerObject.sendBuffer(buffer, type, data, callback);
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
 * { type: "linkShare", fileId: "asd7asd8fas23asd423sdd", username: "asdadsdad" }
 * Device ID not needed since P2P connection
 * */