/**
 * Created by anuradhawick on 8/20/17.
 */
import {Server} from 'fast-tcp';
import path from 'path';
import * as _ from 'lodash';
import fs from 'fs';

import * as sm from './sock-messages';
import * as fUtil from '../sync-engine/sync-helper';
import LocalSyncDbHandler from '../db/local-sync-db';

export default class SocketCommunicator {
    sockObject;
    server;
    username;
    dbh;

    constructor(username) {
        this.username = username;
        this.server = new Server();
        this.server.listen(5000);
        this.server.on('connection', (socket) => {
            this.sockObject = socket;
            this.initCommunication();
            console.log('socket connected')
        });
        this.dbh = new LocalSyncDbHandler();
    }

    initCommunication() {
        this.sockObject.on('message', async (json) => {
            const username = json.username;

            switch (json.type) {
                case sm.getSyncPaths:
                    let folders = await this.dbh.getFolders(username);
                    folders = _.map(folders, (folder) => localizePath(username, folder));

                    let results = fUtil.getDataForLocalSync(folders);
                    results = _.map(results, (result) => {
                        result.path = normalizePath(username, result.path);
                        return result;
                    });
                    this.sockObject.emit('message', {type: sm.syncPaths, paths: results});
                    break;
                case sm.requestFile:
                    const fPath = path.resolve(process.env.PD_FOLDER_PATH, username, json.path);
                    const writeStream = this.sockObject.stream('file', { type: sm.newFile, path: json.path });
                    fs.createReadStream(fPath).pipe(writeStream);
                    break;
            }
        });

        this.sockObject.on('file', (stream, json) => {

        });

        // Client
        // var writeStream = socket.stream('image', { name: 'img-copy.jpg' }, function (response) {
        //     console.log('Response: ' + response);
        // });
        // fs.createReadStream('img.jpg').pipe(writeStream);
    }
}

function localizePath(username, folder) {
    return path.resolve(process.env.PD_FOLDER_PATH, username, folder);
}

function normalizePath(username, fullPath) {
    return _.replace(fullPath, path.resolve(process.env.PD_FOLDER_PATH, username) + '/', '');
}