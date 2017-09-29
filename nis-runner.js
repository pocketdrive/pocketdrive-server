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
const otherDeviceID = '';

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
    otherDeiviceId;

    constructor(deviceId, otherDeviceId, username) {
        this.deviceId = deviceId;
        this.otherDeiviceId = otherDeviceId;
        this.username = username;
        this.sock = new Socket({
            host: 'localhost',
            port: 5001
        });
    }

    reconnect() {
        this.sock.destroy();

        this.sock = new Socket({
            host: 'localhost',
            port: 5001
        });
    }

    requestFileHashes() {
        const sock = this.sock;

        sock.on('file', (readStream, json) => {
            const filepath = path.join(clientStoragePath, this.deviceId, json.username, json.path);
            this.preparePath(path.dirname(filepath));
            const writeStream = fs.createWriteStream(filepath);

            readStream.pipe(writeStream);
        });

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


                    if (fs.existsSync(deletePath)) {
                        if (fs.statSync(deletePath).isDirectory()) {
                            fse.removeSync(deletePath);
                        } else {
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

        // update the PD with data from carrier
        const otherEvents = (await NisClientDbHandler.getOrderedOperations(this.otherDeiviceId, this.username)).data;
        const conflicts = [];

        // Detect conflicts
        _.each(events, (event1) => {
            _.each(otherEvents, (event2) => {
                // if the event corresponds to the same path and username
                if (event1.user === event2.user && event1.path === event2.path) {
                    conflicts.push({
                        e1: event1,
                        e2: event2
                    })
                }
            });
        });

        // For all other non-conflicting items
        _.each(otherEvents, (otherEvent) => {
            const hasConflict = _.find(conflicts, (obj) => {
                return obj.e2 === otherEvent;
            });

            if (_.isEmpty(hasConflict)) {
                switch (otherEvent.action) {
                    case 'NEW':
                        const newFilePath = path.join(clientStoragePath, this.otherDeiviceId, this.username, otherEvent.path);
                        const newType = otherEvent.type; // dir or file

                        if (fs.existsSync(newFilePath)) {
                            const writeStream = sock.stream('file', {
                                type: 'new',
                                fileType: newType,
                                path: otherEvent.path,
                                username: this.username
                            });
                            fs.createReadStream(newFilePath).pipe(writeStream);
                        }
                        break;
                    case 'MODIFY':
                        const modFilePath = path.join(clientStoragePath, this.otherDeiviceId, this.username, otherEvent.path);

                        if (fs.existsSync(modFilePath)) {
                            const writeStream = sock.stream('file', {
                                type: 'update',
                                path: otherEvent.path,
                                username: this.username
                            });
                            fs.createReadStream(modFilePath).pipe(writeStream);
                        }
                        break;
                    case 'DELETE':
                        // TODO is the type really needed?
                        // const deleteType = otherEvent.type;
                        sock.emit('message', {
                            type: 'delete',
                            // deleteType: deleteType,
                            username: otherEvent.user,
                            path: otherEvent.path
                        });
                        break;
                    case 'RENAME':
                        const renameType = otherEvent.type;

                        sock.emit('message', {
                            type: 'rename',
                            username: otherEvent.user,
                            renameType:renameType,
                            path: otherEvent.path,
                            oldPath: otherEvent.oldPath
                        });
                        break;
                }
            }
        });

        // Now its ok to clean the other events since all are cleaned


        // const that = this;
        // setTimeout(() => {
        //     // that.reconnect();
        //     that.requestFileHashes();
        // }, 5000);
    }

    preparePath(filepath) {
        if (!fs.existsSync(filepath)) {
            mkdirp.sync(filepath);
        }
    }
}