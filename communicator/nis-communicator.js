import {Server} from 'fast-tcp';
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
    clientStats = {};

    constructor() {
        // Initialize server to listen for incoming messages
        this.server = new Server();
        this.server.on('connection', (socket) => {
            this.clientStats[socket.id] = {id: socket.id};
            this.initCommunication(socket);
            console.log('NIS client connected');
        });
        this.server.listen(5001);
        console.log('NIS server started on port 5001');
    }

    initCommunication(socket) {
        socket.on('message', async (json, callBack) => {
                // const fullPath = path.join(process.env.PD_FOLDER_PATH, json.username, json.path);
                switch (json.type) {
                    case 'getEvents':
                        // TODO filter by username and otherDevice id
                        NisDBHandler.getEvents(json.username, json.otherDeviceID).then((data) => {
                            callBack(data)
                        });
                        break;

                    case 'flushEvents':
                        const ids = json.ids || [];
                        _.each(ids, (_id) => {
                            NisDBHandler.deleteEntryById(_id);
                        });

                        callBack(true);
                        break;

                    case 'requestFile':
                        const filePath = path.join(process.env.PD_FOLDER_PATH, json.username, json.path);

                        if (fs.existsSync(filePath)) {
                            const writeStream = socket.stream('file', {path: json.path, username: json.username});
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
                        } catch (e) {
                            console.error('COULD NOT RENAME');
                        }
                        break;

                    case 'delete':
                        const deletePath = path.join(process.env.PD_FOLDER_PATH, json.username, json.path);

                        if (json.ignore) {
                            NisEventListener.ignoreEvents.push(filepath);
                        }

                        if (fs.existsSync(deletePath)) {
                            if (fs.statSync(deletePath).isDirectory()) {
                                fs.rmdirSync(deletePath);
                            } else {
                                fs.unlinkSync(deletePath);
                            }
                        }

                        break;
                }
            }
        );

        socket.on('file', (readStream, json) => {
            const filepath = path.join(process.env.PD_FOLDER_PATH, json.username, json.path);

            if (json.ignore) {
                NisEventListener.ignoreEvents.push(filepath);
            }

            this.preparePath(path.dirname(filepath));
            const writeStream = fs.createWriteStream(filepath);
            readStream.pipe(writeStream);
        });
    }

    preparePath(filepath) {
        if (!fs.existsSync(filepath)) {
            mkdirp.sync(filepath);
        }
    }

}