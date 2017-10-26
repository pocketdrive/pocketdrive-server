import {Server, Socket} from 'fast-tcp';
import path from 'path';
import fs from 'fs';
import streamToBuffer from 'stream-to-buffer';
import stream from 'stream';
import * as _ from 'lodash';

import {SyncMessages, SyncActions, SyncActionMessages, SyncEvents} from '../sync-engine/sync-constants';
import * as syncActions from '../sync-engine/sync-actions';
import {modifyExistingFile} from "../sync-engine/sync-actions";
import {createOrModifyFile} from "../sync-engine/sync-actions";
import {getFileChecksum} from "../sync-engine/sync-actions";
import {afterSyncFile} from "../sync-engine/sync-actions";
import {ChunkBasedSynchronizer} from "../sync-engine/chunk-based-synchronizer";
import {deleteMetadataEntry} from "../sync-engine/sync-actions";
import {setSyncedChecksum} from "../sync-engine/sync-actions";
import {getCheckSum} from "../utils/meta-data";
import {getSyncedChecksum} from "../sync-engine/sync-actions";
import {CommonUtils} from "../utils/common";
import {checkExistence} from "../sync-engine/sync-actions";
import {isFolderEmpty} from "../sync-engine/sync-actions";
import {getFolderChecksum} from "../sync-engine/sync-actions";
import MetadataDBHandler from "../db/sync-meta-db";
import {SyncRunner} from "../sync-engine/sync-runner";

/**
 * @author Dulaj Atapattu
 */
export default class SyncCommunicator {

    clientStats = {};

    constructor() {
        // Initialize server to listen for incoming messages
        this.server = new Server();
        this.server.on('connection', (socket) => {
            this.clientStats[socket.id] = {id: socket.id};
            this.initCommunication(socket);
            console.log('Sync client connected');
        });
        this.server.listen(5000);
        console.log('Sync server started on port 5000');
    }

    openSocket(clientStats) {
        this.clientStats[clientStats.id].socket = new Socket({
            host: clientStats.clientIP,
            port: 6000
        });

        this.clientStats[clientStats.id].serializeLock = 0;
    }

    closeSocket(clientStats) {
        clientStats.socket.destroy();
    }

    initCommunication(socket) {
        socket.on('message', async (json, callBack) => {
            const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.path);

            switch (json.type) {
                case SyncMessages.modifyFile:
                    console.log('Sync message [FILE][MODIFY]: ', json.path);

                    callBack(await createOrModifyFile(fullPath, json.current_cs, json.synced_cs));
                    break;

                case SyncMessages.renameFile:
                    console.log('Sync message [FILE][RENAME]: ', json.oldPath, ' --> ', json.path);

                    let fullOldPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.oldPath);

                    if (syncActions.checkExistence(fullOldPath) && !syncActions.checkExistence(fullPath)) {
                        const currentChecksum = getFileChecksum(fullOldPath);

                        if (currentChecksum === json.current_cs) {
                            fs.renameSync(fullOldPath, fullPath);
                            callBack({action: SyncActions.doNothingFile});

                        } else if (currentChecksum === json.synced_cs) {
                            fs.renameSync(fullOldPath, fullPath);
                            callBack(await createOrModifyFile(fullPath, json.current_cs, json.synced_cs));

                        } else {
                            callBack(await createOrModifyFile(fullPath, json.current_cs, json.synced_cs));
                        }
                    }
                    if (syncActions.checkExistence(fullOldPath) && syncActions.checkExistence(fullPath)) {
                        const currentChecksumOld = getFileChecksum(fullOldPath);
                        const currentChecksumNew = getFileChecksum(fullPath);

                        if (currentChecksumOld === currentChecksumNew) {
                            fs.unlinkSync(fullOldPath);
                        }
                    }
                    else {
                        callBack(await createOrModifyFile(fullPath, json.current_cs, json.synced_cs));
                    }

                    break;

                case SyncMessages.deleteFile:
                    console.log('Sync message [FILE][DELETE]: ', json.path);

                    if (syncActions.checkExistence(fullPath)) {
                        const currentChecksum = getFileChecksum(fullPath);

                        if (json.synced_cs === currentChecksum) {
                            console.log('deleted', fullPath);
                            fs.unlinkSync(fullPath);
                        }
                    }

                    callBack({action: SyncActions.doNothingFile});

                    break;

                case SyncMessages.newFolder:
                    console.log('Sync message [DIR][NEW]: ', json.path);

                    if (!checkExistence(fullPath)) {
                        fs.mkdirSync(fullPath);
                    }

                    callBack({action: SyncActions.doNothingDir});

                    break;

                case SyncMessages.deleteFolder:
                    console.log('Sync message [DIR][DELETE]: ', json.path);

                    if (syncActions.checkExistence(fullPath) && isFolderEmpty(fullPath)) {
                        fs.rmdirSync(fullPath);
                    }

                    callBack({action: SyncActions.doNothingDir});

                    break;

                case SyncMessages.renameFolder:
                    console.log('Sync message [DIR][RENAME]: ', json.oldPath, ' --> ', json.path);

                    fullOldPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.oldPath);

                    if (checkExistence(fullOldPath) && await getFolderChecksum(fullOldPath) === json.current_cs) {
                        if (!checkExistence(fullPath)) {
                            fs.renameSync(fullOldPath, fullPath);
                        }
                        else if (await getFolderChecksum(fullOldPath) === await getFolderChecksum(fullPath)) {
                            fs.rmdirSync(fullOldPath);
                        }
                        else {
                            const names = _.split(json.path, '/');
                            const newName = names[names.length - 1] + '(conflicted-copy-of-' + json.username + '-' + CommonUtils.getDeviceName() + '-' + CommonUtils.getDateTime() + ')';
                            const newPath = _.replace(json.path, names[names.length - 1], newName);
                            const fullNewPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, newPath);

                            fs.renameSync(fullOldPath, fullNewPath);
                        }

                        callBack({action: SyncActions.doNothingDir});

                    }
                    else {
                        if (!checkExistence(fullPath)) {
                            callBack({action: SyncActions.streamFolder, isConflict: false});
                        }
                        else if (await getFolderChecksum(fullPath) === json.current_cs) {
                            callBack({action: SyncActions.doNothingDir});
                        }
                        else {
                            callBack({action: SyncActions.streamFolder, isConflict: true});
                        }
                    }

                    break;

                /*case sm.requestFile:
                    console.log('Fie message: ', json.path);
                    const fPath = path.resolve(process.env.PD_FOLDER_PATH, json.path);
                    const writeStream = socket.stream('file', {type: sm.newFile, path: json.path});
                    fs.createReadStream(fPath).pipe(writeStream);
                    break;*/
            }
        });

        socket.on('action', async (json, callBack) => {
            switch (json.type) {
                case SyncActionMessages.connectToClient:
                    console.log('Sync action [CONNECT_TO_CLIENT]: ', json.ip);
                    this.clientStats[socket.id].clientIP = json.ip;
                    this.openSocket(this.clientStats[socket.id]);
                    break;

                case SyncActionMessages.disconnectFromClient:
                    console.log('Sync action [DISCONNECT_FROM_CLIENT]');
                    this.closeSocket(this.clientStats[socket.id]);
                    callBack();
                    break;

                case SyncActionMessages.newFolder:
                    const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.path);
                    console.log('Sync action [NEW_FOLDER]: ', json.path);
                    fs.mkdirSync(fullPath);
                    callBack();
                    break;

                case SyncActionMessages.serverToPdSync:
                    // console.log('Sync action [SERVER_TO_PD_SYNC]');
                    this.clientStats[socket.id]['username'] = json.username;

                    if (!SyncRunner.eventListeners[this.clientStats[socket.id].username].isWatcherRunning) {
                        this.doSync(this.clientStats[socket.id], callBack);
                    } else{
                        callBack();
                    }

                    break;
            }
        });

        socket.on('file', function (readStream, json) {
            console.log('Sync file [FILE_COPY]: ', json.path);

            const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.path);

            let writeStream = fs.createWriteStream(fullPath);
            readStream.pipe(writeStream);

            writeStream.on('finish', function () {
                setSyncedChecksum(json.path, getCheckSum(fullPath));
            });
        });

        socket.on('transmissionData', (readStream, json) => {
            console.log('Sync transmissionData: ', json.path);

            streamToBuffer(readStream, (err, transmissionData) => {
                const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.path);
                ChunkBasedSynchronizer.updateOldFile(transmissionData, fullPath);
            })
        });
    }

    async sendSyncRequest(clientStats, dbEntry) {
        clientStats.serializeLock++;

        if (dbEntry.type === 'file') {
            switch (dbEntry.action) {
                case SyncEvents.NEW:
                case SyncEvents.MODIFY:
                    console.log('Sync request [FILE][MODIFY]: ', dbEntry.path);

                    clientStats['socket'].emit('message', {
                        username: dbEntry.user,
                        type: SyncMessages.modifyFile,
                        path: dbEntry.path,
                        current_cs: dbEntry.current_cs,
                        synced_cs: await getSyncedChecksum(dbEntry.path),
                    }, (response) => this.onResponse(clientStats, dbEntry, response));

                    break;

                case SyncEvents.RENAME:
                    console.log('Sync request [FILE][RENAME]: ', dbEntry.oldPath, ' --> ', dbEntry.path);

                    clientStats.socket.emit('message', {
                        username: dbEntry.user,
                        type: SyncMessages.renameFile,
                        path: dbEntry.path,
                        oldPath: dbEntry.oldPath,
                        current_cs: dbEntry.current_cs,
                        synced_cs: await getSyncedChecksum(dbEntry.path),
                    }, (response) => this.onResponse(clientStats, dbEntry, response));

                    break;

                case SyncEvents.DELETE:
                    console.log('Sync request [FILE][DELETE]: ', dbEntry.path);

                    clientStats.socket.emit('message', {
                        username: dbEntry.user,
                        type: SyncMessages.deleteFile,
                        path: dbEntry.path,
                        current_cs: dbEntry.current_cs,
                        synced_cs: await getSyncedChecksum(dbEntry.path),
                    }, (response) => this.onResponse(clientStats, dbEntry, response));
                    break;
            }
        } else if (dbEntry.type === 'dir') {
            switch (dbEntry.action) {
                case SyncEvents.NEW:
                    console.log('Sync request [DIR][NEW]: ', dbEntry.path);

                    clientStats.socket.emit('message', {
                        username: dbEntry.user,
                        type: SyncMessages.newFolder,
                        path: dbEntry.path,
                    }, (response) => this.onResponse(clientStats, dbEntry, response));

                    break;

                case SyncEvents.RENAME:
                    console.log('Sync request [DIR][RENAME]: ', dbEntry.oldPath, ' --> ', dbEntry.path);

                    clientStats.socket.emit('message', {
                        username: dbEntry.user,
                        type: SyncMessages.renameFolder,
                        path: dbEntry.path,
                        oldPath: dbEntry.oldPath,
                        current_cs: dbEntry.current_cs
                    }, (response) => this.onResponse(clientStats, dbEntry, response));

                    break;

                case SyncEvents.DELETE:
                    console.log('Sync request [DIR][DELETE]: ', dbEntry.path);

                    clientStats.socket.emit('message', {
                        username: dbEntry.user,
                        type: SyncMessages.deleteFolder,
                        path: dbEntry.path,
                    }, (response) => this.onResponse(clientStats, dbEntry, response));

                    break;

            }
        }
    }

    async onResponse(clientStats, dbEntry, response) {
        const fullPath = path.resolve(process.env.PD_FOLDER_PATH, dbEntry.user, dbEntry.path);

        switch (response.action) {
            case SyncActions.justCopy:
                console.log('Sync response [FILE][JUST_COPY]: ', dbEntry.path);

                if (checkExistence(fullPath)) {
                    let writeStream = clientStats.socket.stream('file', {path: dbEntry.path});
                    fs.createReadStream(fullPath).pipe(writeStream);
                }

                afterSyncFile(dbEntry.sequence_id, dbEntry.path, dbEntry.current_cs);
                break;

            case SyncActions.doNothingFile:
                console.log('Sync response [FILE][DO_NOTHING_FILE]: ', dbEntry.path);

                afterSyncFile(dbEntry.sequence_id, dbEntry.path, dbEntry.current_cs);
                break;

            case SyncActions.doNothingDir:
                console.log('Sync response [DIR][DO_NOTHING_DIR]: ', dbEntry.path);

                afterSyncFile(dbEntry.sequence_id, dbEntry.path, dbEntry.current_cs);
                break;

            case SyncActions.update:
                console.log('Sync response [FILE][UPDATE]: ', dbEntry.path);

                const newFileChecksum = await ChunkBasedSynchronizer.getChecksumOfChunks(fullPath);
                const transmissionData = await ChunkBasedSynchronizer.getTransmissionData(response.oldFileChecksums, newFileChecksum, fs.readFileSync(fullPath));

                /*clientStats.socket.emit('action', {
                    type: SyncActionMessages.chunkBasedSync,
                    transmissionData: transmissionData,
                    path: dbEntry.path
                });*/

                let writeStream = clientStats.socket.stream('transmissionData', {path: dbEntry.path});

                let bufferStream = new stream.PassThrough();
                bufferStream.end(transmissionData);
                bufferStream.pipe(writeStream);

                afterSyncFile(dbEntry.sequence_id, dbEntry.path, dbEntry.current_cs);
                break;

            case SyncActions.conflict:
                console.log('Sync response [FILE][CONFLICT]: ', dbEntry.path);

                const names = _.split(dbEntry.path, '/');
                const nameAndExtension = _.split(names[names.length - 1], '.');
                const newNameWithExtension = nameAndExtension[0] + '(conflicted-copy-of-' + dbEntry.user + '-' + CommonUtils.getDeviceName() + '-' + CommonUtils.getDateTime() + ').' + nameAndExtension[1];
                const newPath = _.replace(dbEntry.path, names[names.length - 1], newNameWithExtension);
                const fullNewPath = path.resolve(process.env.PD_FOLDER_PATH, dbEntry.username, newPath);

                fs.renameSync(fullPath, fullNewPath);

                let ws = clientStats.socket.stream('file', {path: newPath}, (response) => {
                    console.log('Conflicted file copied : ' + response);
                    deleteMetadataEntry(dbEntry.sequence_id);
                    setSyncedChecksum(newPath, dbEntry.current_cs);
                });

                fs.createReadStream(fullNewPath).pipe(ws);
                // TODO: Check whether the remote side original file has to be copied manually.
                break;

            case SyncActions.streamFolder:
                console.log('Sync response [DIR][STREAM_FOLDER]: ', dbEntry.path);

                if (response.isConflict) {
                    const names = _.split(dbEntry.path, '/');
                    const newName = names[names.length - 1] + '(conflicted-copy-of-' + dbEntry.user + '-' + CommonUtils.getDeviceName() + '-' + CommonUtils.getDateTime() + ')';
                    const newPath = _.replace(dbEntry.path, names[names.length - 1], newName);

                    this.syncNewDirectory(clientStats.socket, dbEntry.user, dbEntry.path, newPath);

                } else {
                    this.syncNewDirectory(clientStats, dbEntry.user, dbEntry.path, dbEntry.path)
                }

                afterSyncFile(dbEntry.sequence_id, dbEntry.path, dbEntry.current_cs);
                break;
        }

        clientStats.serializeLock--;
    }

    async syncNewDirectory(clientStats, username, sourcePath, targetPath) {
        clientStats.serializeLock++;
        // TODO: Recheck for folder names with dots.
        const fullSourcePath = path.resolve(process.env.PD_FOLDER_PATH, username, sourcePath);

        clientStats.socket.emit('action', {
            type: SyncActionMessages.newFolder,
            path: targetPath
        }, async () => {
            const files = fs.readdirSync(fullSourcePath);

            for (let i = 0; i < files.length; i++) {
                const sourceItemPath = path.join(sourcePath, files[i]);
                const targetItemPath = path.join(targetPath, files[i]);
                const fullSourceItemPath = path.resolve(process.env.PD_FOLDER_PATH, username, sourceItemPath);

                if (fs.statSync(fullSourceItemPath).isDirectory()) {
                    await this.syncNewDirectory(clientStats, username, sourceItemPath, targetItemPath);
                }
                else {
                    let ws = clientStats.socket.stream('file', {path: targetItemPath});
                    fs.createReadStream(fullSourceItemPath).pipe(ws);
                }
            }
        });

        clientStats.serializeLock--;
    }

    async doSync(clientStats, callBack) {
        clientStats.serializeLock = 0;

        await MetadataDBHandler.getChangesOfUser(clientStats.username).then(async (changes) => {
            changes = changes.data;
            let i = 0;
            let tryCount = 0;

            const intervalId = setInterval(async () => {
                if (clientStats.serializeLock === 0) {
                    tryCount = 0;
                    if (i < changes.length) {
                        await this.sendSyncRequest(clientStats, changes[i++]);
                    }
                    else {
                        clearInterval(intervalId);
                        callBack();
                    }
                }
                else if (tryCount === 10) {
                    this.closeSocket(clientStats);
                    this.openSocket(clientStats);
                    i--;
                    tryCount = 0;
                }
                else {
                    tryCount++;
                    console.log('Retrying to sync: ', tryCount);
                }

            }, 500);

        });
    }

}