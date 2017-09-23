/**
 * Created by anuradhawick on 9/23/17.
 */
import {Socket} from 'fast-tcp';
import DataStore from 'nedb';
import * as _ from 'lodash';
import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import * as fse from 'fs-extra';

const nisClientDb = new DataStore({
    filename: '/Users/anuradhawick/Documents/FYP-work/dbs/nis-client.db',
    autoload: true
});
const clientStoragePath = '/Users/anuradhawick/Documents/FYP-work/Client';

class NisClientDbHandler {
    static getNextSequenceID(deviceId) {
        let result = {success: false};

        return new Promise((resolve) => {
            nisClientDb.find({deviceID: deviceId}).sort({sequence_id: -1}).limit(1).exec((err, docs) => {
                if (err) {
                    this.handleError(result, 'DB Error. Cannot get max sequenceID', err);
                } else {
                    result.success = true;
                    result.data = (docs && docs.length !== 0) ? docs[0].sequence_id + 1 : 0;
                }

                resolve(result);
            });
        });
    }

    static getOrderedOperations(deviceId, username) {
        let result = {success: false};

        return new Promise((resolve) => {
            nisClientDb.find({deviceID: deviceId, user: username}).sort({sequence_id: 1}).exec((err, docs) => {
                if (err) {
                    this.handleError(result, 'DB Error. Cannot get max sequenceID', err);
                } else {
                    result.success = true;
                    result.data = (docs && docs.length !== 0) ? docs : [];
                }

                resolve(result);
            });
        });
    }

    static insertEntry(entry) {
        nisClientDb.insert(entry, (err) => {
        });
    }
}

export default class NisRunner {
    deviceId;
    username;
    sock;

    constructor(deviceId, username) {
        this.deviceId = deviceId;
        this.username = username;
        this.sock = new Socket({
            host: 'localhost',
            port: 5001
        });

        this.sock.on('file', (readStream, json) => {
            const filepath = path.join(clientStoragePath, this.deviceId, json.username, json.path);
            this.preparePath(path.dirname(filepath));
            const writeStream = fs.createWriteStream(filepath);

            readStream.pipe(writeStream);
        });
    }

    requestFileHashes() {
        const sock = this.sock;

        sock.emit('message', {type: 'getEvents'}, async (response) => {
            const ids = [];

            let nextSeqId = (await NisClientDbHandler.getNextSequenceID(this.deviceId)).data;

            _.each(response.data, (eventObj) => {
                eventObj['sequence_id'] = nextSeqId;
                NisClientDbHandler.insertEntry(eventObj);
                nextSeqId++;
                ids.push(eventObj._id);
            });

            sock.emit('message', {type: 'flushEvents', ids: ids}, (response) => {
                if (response) {
                    this.updateCarrier();
                }
            });
        });
    }

    async updateCarrier() {
        // create paths if not exist
        const creatorPath = path.join(clientStoragePath, this.deviceId, this.username);
        const sock = this.sock;
        const events = (await NisClientDbHandler.getOrderedOperations(this.deviceId, this.username)).data;

        this.preparePath(creatorPath);

        _.each(events, (eventObj) => {
            switch (eventObj.action) {
                case 'MODIFY':
                    sock.emit('message', {type: 'requestFile', username: eventObj.user, path: eventObj.path});
                    break;
                case 'NEW':
                    if (eventObj.type === 'dir') {
                        // create the folder
                        const folderPath = path.join(clientStoragePath, this.deviceId, eventObj.user, eventObj.path);
                        this.preparePath(folderPath);
                    } else if (eventObj.type === 'file') {
                        sock.emit('message', {type: 'requestFile', username: eventObj.user, path: eventObj.path});
                    }
                    break;
                case 'DELETE':
                    const deletePath = path.join(clientStoragePath, this.deviceId, eventObj.user, eventObj.path);

                    if(fs.existsSync(deletePath)) {
                        if(fs.statSync(deletePath).isDirectory()) {
                            fse.removeSync(deletePath);
                        } else {
                            console.log(deletePath)
                            fs.unlinkSync(deletePath);
                        }
                    }

                    break;
                case 'RENAME':
                    const oldPath = path.join(clientStoragePath, this.deviceId, eventObj.user, eventObj.oldPath);
                    const newPath = path.join(clientStoragePath, this.deviceId, eventObj.user, eventObj.path);

                    // fs.renameSync(oldPath, newPath);
                    break;
            }
        });


    }

    preparePath(filepath) {
        if (!fs.existsSync(filepath)) {
            mkdirp.sync(filepath);
        }
    }
}