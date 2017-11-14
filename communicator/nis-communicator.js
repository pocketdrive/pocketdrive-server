const io = require('socket.io')();
const ss = require('socket.io-stream');

import path from 'path';
import fs from 'fs';
import * as _ from 'lodash';
import mkdirp from 'mkdirp';

import NisDBHandler from '../db/nis-meta-db';
import NisEventListener from '../nis-engine/nis-event-listener';

/**
 * @author Anuradha Wickramarachchi
 */
export default class NisCommunicator {

    constructor() {
        // Initialize server to listen for incoming messages
        io.on('connection', (socket) => {
            this.initCommunication(socket);
            console.log('NIS client connected');
        });
        io.listen(5001);
        console.log('NIS server started on port 5001');
    }

    initCommunication(socket) {
        socket.on('message', (json) => {
                // const fullPath = path.join(process.env.PD_FOLDER_PATH, json.username, json.path);
                switch (json.type) {
                    case 'getEvents':
                        console.log('[NIS][SERVER_TO_CARRIER]');
                        // TODO filter by username and otherDevice id
                        NisDBHandler.getEvents(json.username, json.otherDeviceID).then((data) => {
                            data.type = 'getEvents';
                            this.callBack(socket, data)
                        });
                        break;

                    case 'flushEvents':
                        const ids = json.ids || [];
                        _.each(ids, (_id) => {
                            NisDBHandler.deleteEntryById(_id);
                        });

                        this.callBack(socket, {type: 'flushEvents', data: true});
                        break;

                    case 'requestFile':
                        const filePath = path.join(process.env.PD_FOLDER_PATH, json.username, json.path);

                        if (fs.existsSync(filePath)) {
                            const writeStream = ss.createStream();
                            ss(socket).emit('file', writeStream, {path: json.path, username: json.username});
                            fs.createReadStream(filePath).pipe(writeStream);
                        }

                        break;

                    case 'rename':
                        const oldPath = path.join(process.env.PD_FOLDER_PATH, json.username, json.oldPath);
                        const newPath = path.join(process.env.PD_FOLDER_PATH, json.username, json.path);

                        if (json.ignore) {
                            NisEventListener.ignoreEvents.push(oldPath);
                            NisEventListener.ignoreEvents.push(newPath);
                        }

                        try {
                            fs.renameSync(oldPath, newPath);
                            setTimeout(() => {
                                NisEventListener.ignoreEvents.splice(oldPath, 1);
                                NisEventListener.ignoreEvents.splice(newPath, 1);
                            }, 5000);

                        } catch (e) {
                            console.error('COULD NOT RENAME', e);
                        }
                        break;

                    case 'delete':
                        const deletePath = path.join(process.env.PD_FOLDER_PATH, json.username, json.path);

                        if (json.ignore) {
                            NisEventListener.ignoreEvents.push(deletePath);
                        }

                        if (fs.existsSync(deletePath)) {
                            if (fs.statSync(deletePath).isDirectory()) {
                                fs.rmdirSync(deletePath);
                            } else {
                                fs.unlinkSync(deletePath);
                            }

                            setTimeout(() => {
                                NisEventListener.ignoreEvents.splice(deletePath, 1)
                            }, 5000);
                        }

                        break;
                }
            }
        );

        ss(socket).on('file', (readStream, json) => {
            const filepath = path.join(process.env.PD_FOLDER_PATH, json.username, json.path);

            if (json.ignore) {
                NisEventListener.ignoreEvents.push(filepath);
            }

            console.log('before >>>>>>>>>>>>>>>>');
            this.preparePath(filepath);
            console.log('after >>>>>>>>>>>>>>>>');
            const writeStream = fs.createWriteStream(filepath);
            readStream.pipe(writeStream);

            writeStream.on('finish', () => {
                setTimeout(() => {
                    NisEventListener.ignoreEvents.splice(filepath, 1);
                }, 5000);
            })
        });

    }

    callBack(socket, data) {
        socket.emit('callBack', data);
    }

    preparePath(filepath) {
        if (!fs.existsSync(filepath)) {
            mkdirp.sync(filepath);
        }
    }

}