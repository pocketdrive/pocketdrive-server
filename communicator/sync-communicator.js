import {Server, Socket} from 'fast-tcp';
import path from 'path';
import fs from 'fs';
import streamToBuffer from 'stream-to-buffer';
import stream from 'stream';
import * as _ from 'lodash';

import {SyncMessages, SyncActions, SyncActionMessages, SyncEvents} from '../sync-engine/sync-constants';
import * as syncActions from '../sync-engine/sync-actions';
import ChecksumDBHandler from "../db/checksum-db";
import {modifyExistingFile} from "../sync-engine/sync-actions";
import {createOrModifyFile} from "../sync-engine/sync-actions";
import {getCurrentChecksum} from "../sync-engine/sync-actions";
import {afterSyncFile} from "../sync-engine/sync-actions";
import {ChunkBasedSynchronizer} from "../sync-engine/chunk-based-synchronizer";
import {deleteMetadataEntry} from "../sync-engine/sync-actions";
import {setSyncedChecksum} from "../sync-engine/sync-actions";
import {getCheckSum} from "../utils/meta-data";
import {getSyncedChecksum} from "../sync-engine/sync-actions";
import {CommonUtils} from "../utils/common";

const log = console.log;

/**
 * @author Dulaj Atapattu
 */
export default class SyncCommunicator {
    username;
    csDBHandler;
    sockObject;
    server;

    socket;
    clientIP;
    clientPort;

    constructor(username, clientIP, clientPort) {
        this.username = username;
        this.clientIP = clientIP;
        this.clientPort = clientPort;

        // Initialize server to listen for incoming messages
        this.server = new Server();
        this.server.on('connection', (socket) => {
            this.sockObject = socket;
            this.initCommunication();
            console.log('socket connected')
        });
        this.server.listen(5000);

        // Initialize socket connection to send messages
        /*this.socket = new Socket({
            host: this.clientIP,
            port: this.clientPort
        });*/

        this.csDBHandler = new ChecksumDBHandler();
    }

    initCommunication() {
        this.sockObject.on('message', async (json, callBack) => {
            const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.path);

            switch (json.type) {
                case SyncMessages.modifyFile:
                    console.log('Sync message [FILE][MODIFY]: ', json.path);

                    callBack(await createOrModifyFile(fullPath, json.current_cs, json.synced_cs));
                    break;

                case SyncMessages.renameFile:
                    console.log('Sync message [FILE][RENAME]: ', json.oldPath, ' --> ', json.path);
                    const fullOldPath = path.resolve(process.env.PD_FOLDER_PATH, json.oldPath);

                    if (syncActions.checkExistence(fullOldPath) && !syncActions.checkExistence(fullPath)) {
                        const currentChecksum = getCurrentChecksum(fullOldPath);

                        if (currentChecksum === json.current_cs) {
                            fs.renameSync(fullOldPath, fullPath);
                            callBack({action: SyncActions.doNothing});

                        } else if (currentChecksum === json.synced_cs) {
                            fs.renameSync(fullOldPath, fullPath);
                            callBack(await createOrModifyFile(fullPath, json.current_cs, json.synced_cs));

                        } else {
                            callBack(await createOrModifyFile(fullPath, json.current_cs, json.synced_cs));
                        }
                    }
                    else {
                        callBack(await createOrModifyFile(fullPath, json.current_cs, json.synced_cs));
                    }

                    break;

                case SyncMessages.deleteFile:
                    console.log('Sync message [FILE][DELETE]: ', json.path);

                    if (syncActions.checkExistence(fullPath)) {
                        const currentChecksum = getCurrentChecksum(fullPath);
                        const syncedChecksum = await getSyncedChecksum(json.path);

                        if (json.current_cs === currentChecksum || json.synced_cs === currentChecksum) {
                            fs.unlinkSync(fullPath);
                        }
                    }

                    callBack({action: SyncActions.doNothing});

                    break;

                /*case sm.requestFile:
                    console.log('Fie message: ', json.path);
                    const fPath = path.resolve(process.env.PD_FOLDER_PATH, json.path);
                    const writeStream = this.sockObject.stream('file', {type: sm.newFile, path: json.path});
                    fs.createReadStream(fPath).pipe(writeStream);
                    break;*/
            }
        });

        this.sockObject.on('action', (json) => {
            switch (json.type) {
                case SyncActionMessages.chunkBasedSync:
                    console.log('Sync action [CHUNK_BASED_SYNC]: ', json.path);

                    const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.path);
                    ChunkBasedSynchronizer.updateOldFile(json.transmissionData, fullPath);
                    break;
            }
        });

        this.sockObject.on('file', function (readStream, json) {
            console.log('Sync file [FILE_COPY]: ', json.path);

            const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.path);

            let writeStream = fs.createWriteStream(fullPath);
            readStream.pipe(writeStream);

            writeStream.on('finish', function () {
                setSyncedChecksum(json.path, getCheckSum(fullPath));
            });
        });

        this.sockObject.on('transmissionData', (readStream, json) => {
            console.log('Sync transmissionData: ', json.path);

            streamToBuffer(readStream, (err, transmissionData) => {
                const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.path);
                ChunkBasedSynchronizer.updateOldFile(transmissionData, fullPath);
            })
        });
    }

    async sendSyncRequest(dbEntry) {
        if (dbEntry.type === 'file') {
            switch (dbEntry.action) {
                case SyncEvents.NEW:
                case SyncEvents.MODIFY:
                    console.log('Sync request [FILE][MODIFY]: ', dbEntry.path);

                    this.socket.emit('message', {
                        type: SyncMessages.modifyFile,
                        path: dbEntry.path,
                        current_cs: dbEntry.current_cs,
                        synced_cs: await getSyncedChecksum(dbEntry.path),
                    }, (response) => this.onResponse(dbEntry, response));

                    break;

                case SyncEvents.RENAME:
                    console.log('Sync request [FILE][RENAME]: ', dbEntry.oldPath, ' --> ', dbEntry.path);

                    this.socket.emit('message', {
                        type: SyncMessages.renameFile,
                        path: dbEntry.path,
                        oldPath: dbEntry.oldPath,
                        current_cs: dbEntry.current_cs,
                        synced_cs: await getSyncedChecksum(dbEntry.path),
                    }, (response) => this.onResponse(dbEntry, response));

                    break;

                case SyncEvents.DELETE:
                    console.log('Sync request [FILE][DELETE]: ', dbEntry.path);

                    await getSyncedChecksum('synced_cs: ', dbEntry.path);

                    this.socket.emit('message', {
                        type: SyncMessages.deleteFile,
                        path: dbEntry.path,
                        current_cs: dbEntry.current_cs,
                        synced_cs: await getSyncedChecksum(dbEntry.path),
                    }, (response) => this.onResponse(dbEntry, response));
                    break;
            }
        } else if (dbEntry.type === 'dir') {
            // TODO
        }
    }

    async onResponse(dbEntry, response) {
        const fullPath = path.resolve(process.env.PD_FOLDER_PATH, dbEntry.path);

        switch (response.action) {
            case SyncActions.justCopy:
                console.log('Sync response [FILE][JUST_COPY]: ', dbEntry.path);

                let writeStream = this.socket.stream('file', {path: dbEntry.path});
                fs.createReadStream(fullPath).pipe(writeStream);

                afterSyncFile(dbEntry.path, dbEntry.current_cs);
                break;

            case SyncActions.doNothing:
                console.log('Sync response [FILE][DO_NOTHING]: ', dbEntry.path);

                afterSyncFile(dbEntry.path, dbEntry.current_cs);
                break;

            case SyncActions.update:
                console.log('Sync response [FILE][UPDATE]: ', dbEntry.path);

                const newFileChecksum = await ChunkBasedSynchronizer.getChecksumOfChunks(fullPath);
                const transmissionData = await ChunkBasedSynchronizer.getTransmissionData(response.oldFileChecksums, newFileChecksum, fs.readFileSync(fullPath));

                /*this.socket.emit('action', {
                    type: SyncActionMessages.chunkBasedSync,
                    transmissionData: transmissionData,
                    path: dbEntry.path
                });*/

                writeStream = this.socket.stream('transmissionData', {path: dbEntry.path});

                let bufferStream = new stream.PassThrough();
                bufferStream.end(transmissionData);
                bufferStream.pipe(writeStream);

                afterSyncFile(dbEntry.path, dbEntry.current_cs);
                break;

            case SyncActions.conflict:
                console.log('Sync response [FILE][CONFLICT]: ', dbEntry.path);

                const names = _.split(dbEntry.path, '/');
                const nameAndExtension = _.split(names[names.length - 1], '.');
                const newNameWithExtension = nameAndExtension[0] + '(conflicted-copy-of-' + this.username + '-' + CommonUtils.getDeviceName() + '-' + CommonUtils.getDateTime() + ').' + nameAndExtension[1];
                const newPath = _.replace(dbEntry.path, names[names.length - 1], newNameWithExtension);
                const fullNewPath = path.resolve(process.env.PD_FOLDER_PATH, newPath);

                fs.renameSync(fullPath, fullNewPath);

                let ws = this.socket.stream('file', {path: newPath}, (response) => {
                    console.log('Conflicted file copied : ' + response);
                    deleteMetadataEntry(dbEntry.path);
                    setSyncedChecksum(newPath, dbEntry.current_cs);
                });

                fs.createReadStream(fullNewPath).pipe(ws);
                // TODO: Check whether the remote side original file has to be copied manually.
                break;
        }
    }

}