import {Server, Socket} from 'fast-tcp';
import path from 'path';
import fs from 'fs';
import * as _ from 'lodash';
import mkdirp from 'mkdirp';
import * as fse from 'fs-extra';

import NisDBHandler from './nis-db';

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
                        NisDBHandler.getAllEvents().then((data) => {
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

                        try {
                            fs.renameSync(oldPath, newPath);
                        } catch (e) {
                            console.error('COULD NOT RENAME');
                        }
                        break;
                    case 'delete':
                        const deletePath = path.join(process.env.PD_FOLDER_PATH, json.username, json.path);

                        if (fs.existsSync(deletePath)) {
                            if (fs.statSync(deletePath).isDirectory()) {
                                fse.removeSync(deletePath);
                            } else {
                                fs.unlinkSync(deletePath);
                            }
                        }
                        break;
                }
            }
        );

        socket.on('file', (readStream, json) => {
            switch(json.type) {
                case 'new':
                    const filepath = path.join(process.env.PD_FOLDER_PATH, json.username, json.path);

                    if (json.fileType === 'dir') {
                        this.preparePath(filepath);
                    } else if (json.fileType === 'file') {
                        this.preparePath(path.dirname(filepath));
                        const writeStream = fs.createWriteStream(filepath);

                        readStream.pipe(writeStream);
                    }
                    break;
                case 'update':
                    // This is always a file, cannot be a folder
                    const filepathUpdate = path.join(process.env.PD_FOLDER_PATH, json.username, json.path);
                    this.preparePath(path.dirname(filepathUpdate));
                    const writeStreamUpdate = fs.createWriteStream(filepathUpdate);

                    readStream.pipe(writeStreamUpdate);
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