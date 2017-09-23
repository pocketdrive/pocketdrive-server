import {Server, Socket} from 'fast-tcp';
import path from 'path';
import fs from 'fs';
import streamToBuffer from 'stream-to-buffer';
import * as _ from 'lodash';

import NisDBHandler from '../db/nis-db';


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
            console.log('Client connected');

        });
        this.server.listen(5001);
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
                }
            }
        );

        socket.on('file', function (readStream, json) {
            console.log('Sync file [FILE_COPY]: ', json.path);

            const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.path);

            let writeStream = fs.createWriteStream(fullPath);
            readStream.pipe(writeStream);

            writeStream.on('finish', function () {
                // setSyncedChecksum(json.path, getCheckSum(fullPath));
            });
        });

        socket.on('transmissionData', (readStream, json) => {
            console.log('Sync transmissionData: ', json.path);

            streamToBuffer(readStream, (err, transmissionData) => {
                const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.path);
                // ChunkBasedSynchronizer.updateOldFile(transmissionData, fullPath);
            })
        });
    }


}