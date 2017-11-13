const io = require('socket.io')();
const ss = require('socket.io-stream');

import path from 'path';
import fs from 'fs';
import streamToBuffer from 'stream-to-buffer';
import stream from 'stream';
import * as _ from 'lodash';

import {SyncActionMessages, SyncActions, SyncEvents, SyncMessages} from '../sync-engine/sync-constants';
import * as syncActions from '../sync-engine/sync-actions';
import {
    afterSyncFile,
    checkExistence,
    createOrModifyFile,
    deleteMetadataEntry,
    getFileChecksum,
    getFolderChecksum,
    getSyncedChecksum,
    isFolderEmpty,
    setSyncedChecksum
} from '../sync-engine/sync-actions';
import {ChunkBasedSynchronizer} from "../sync-engine/chunk-based-synchronizer";
import {getCheckSum} from "../utils/meta-data";
import {CommonUtils} from "../utils/common";
import MetadataDBHandler from "../db/sync-meta-db";
import {SyncRunner} from "../sync-engine/sync-runner";

/**
 * @author Dulaj Atapattu
 */
export default class SyncCommunicator {

    clientStats = {};

    constructor() {
        // Initialize server to listen for incoming messages
        io.on('connection', (socket) => {
            this.clientStats[socket.id] = {id: socket.id, socket: socket};
            this.initCommunication(socket);
            console.log('Sync client connected');
        });
        io.listen(5000);

        console.log('Sync server started on port 5000');
    }

    initCommunication(socket) {
        socket.on('message', async (json) => {
            const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.path);

            switch (json.type) {
                case SyncMessages.modifyFile:
                    console.log('Sync message [FILE][MODIFY]: ', json.path);
                    this.callBack(socket, await createOrModifyFile(fullPath, json));
                    break;

                case SyncMessages.renameFile:
                    console.log('Sync message [FILE][RENAME]: ', json.oldPath, ' --> ', json.path);

                    let fullOldPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.oldPath);

                    if (syncActions.checkExistence(fullOldPath) && !syncActions.checkExistence(fullPath)) {
                        const currentChecksum = getFileChecksum(fullOldPath);

                        if (currentChecksum === json.current_cs) {
                            fs.renameSync(fullOldPath, fullPath);
                            this.callBack(socket, {
                                type: 'onResponse',
                                action: SyncActions.doNothingFile,
                                dbEntry: json.dbEntry
                            });

                        } else if (currentChecksum === json.synced_cs) {
                            fs.renameSync(fullOldPath, fullPath);
                            this.callBack(socket, await createOrModifyFile(fullPath, json));

                        } else {
                            this.callBack(socket, await createOrModifyFile(fullPath, json));
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
                        this.callBack(socket, await createOrModifyFile(fullPath, json));
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

                    this.callBack(socket, {
                        type: 'onResponse',
                        action: SyncActions.doNothingFile,
                        dbEntry: json.dbEntry
                    });

                    break;

                case SyncMessages.newFolder:
                    console.log('Sync message [DIR][NEW]: ', json.path);

                    if (!checkExistence(fullPath)) {
                        fs.mkdirSync(fullPath);
                    }

                    this.callBack(socket, {
                        type: 'onResponse',
                        action: SyncActions.doNothingDir,
                        dbEntry: json.dbEntry
                    });

                    break;

                case SyncMessages.deleteFolder:
                    console.log('Sync message [DIR][DELETE]: ', json.path);

                    if (syncActions.checkExistence(fullPath) && isFolderEmpty(fullPath)) {
                        fs.rmdirSync(fullPath);
                    }

                    this.callBack(socket, {
                        type: 'onResponse',
                        action: SyncActions.doNothingDir,
                        dbEntry: json.dbEntry
                    });

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

                        this.callBack(socket, {
                            type: 'onResponse',
                            action: SyncActions.doNothingDir,
                            dbEntry: json.dbEntry
                        });

                    }
                    else {
                        if (!checkExistence(fullPath)) {
                            this.callBack(socket, {
                                type: 'onResponse',
                                action: SyncActions.streamFolder,
                                isConflict: false,
                                dbEntry: json.dbEntry
                            });
                        }
                        else if (await getFolderChecksum(fullPath) === json.current_cs) {
                            this.callBack(socket, {
                                type: 'onResponse',
                                action: SyncActions.doNothingDir,
                                dbEntry: json.dbEntry
                            });
                        }
                        else {
                            this.callBack(socket, {
                                type: 'onResponse',
                                action: SyncActions.streamFolder,
                                isConflict: true,
                                dbEntry: json.dbEntry
                            });
                        }
                    }

                    break;

            }
        });

        socket.on('action', async (json) => {
            switch (json.type) {
                case SyncActionMessages.newFolder:
                    const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.path);
                    console.log('Sync action [NEW_FOLDER]: ', json.path);
                    fs.mkdirSync(fullPath);
                    this.callBack(socket, {type: 'newFolder', sourcePath: json.sourcePath});
                    break;

                case SyncActionMessages.serverToPdSync:
                    console.log('[SYNC][SERVER_TO_CLIENT]');
                    this.clientStats[socket.id]['username'] = json.username;

                    if (SyncRunner.eventListeners[this.clientStats[socket.id].username] &&
                        !SyncRunner.eventListeners[this.clientStats[socket.id].username].isWatcherRunning) {
                        this.doSync(this.clientStats[socket.id], this.callBack);
                    } else {
                        this.callBack(socket, {type: 'serverToPdSync'});
                    }

                    break;
            }
        });

        ss(socket).on('file', (readStream, json) => {
            console.log('Sync file [FILE_COPY]: ', json.path);

            const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.path);

            let writeStream = fs.createWriteStream(fullPath);
            readStream.pipe(writeStream);

            writeStream.on('finish', () => {
                setSyncedChecksum(json.path, getCheckSum(fullPath));
            });
        });

        ss(socket).on('transmissionData', (readStream, json) => {
            console.log('Sync transmissionData: ', json.path);

            streamToBuffer(readStream, (err, transmissionData) => {
                const fullPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.path);
                ChunkBasedSynchronizer.updateOldFile(transmissionData, fullPath);
            })
        });

        socket.on('callBack', async (json) => {
            switch (json.type) {
                case 'onResponse':
                    this.onResponse(this.clientStats[socket.id], json);
                    break;

                case 'newFolder':
                    const fullSourcePath = path.resolve(process.env.PD_FOLDER_PATH, json.username, json.sourcePath);
                    const files = fs.readdirSync(fullSourcePath);

                    for (let i = 0; i < files.length; i++) {
                        const sourceItemPath = path.join(json.sourcePath, files[i]);
                        const targetItemPath = path.join(targetPath, files[i]);
                        const fullSourceItemPath = path.resolve(process.env.PD_FOLDER_PATH, json.username, sourceItemPath);

                        if (fs.statSync(fullSourceItemPath).isDirectory()) {
                            await this.syncNewDirectory(clientStats, json.username, sourceItemPath, targetItemPath);
                        }
                        else {
                            const writeStream = ss.createStream();
                            ss(socket).emit('file', writeStream, {path: targetItemPath});
                            fs.createReadStream(fullSourceItemPath).pipe(writeStream);
                        }
                    }

                    break;
            }
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
                        dbEntry: dbEntry
                    });

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
                        dbEntry: dbEntry
                    });

                    break;

                case SyncEvents.DELETE:
                    console.log('Sync request [FILE][DELETE]: ', dbEntry.path);

                    clientStats.socket.emit('message', {
                        username: dbEntry.user,
                        type: SyncMessages.deleteFile,
                        path: dbEntry.path,
                        current_cs: dbEntry.current_cs,
                        synced_cs: await getSyncedChecksum(dbEntry.path),
                        dbEntry: dbEntry
                    });
                    break;
            }
        } else if (dbEntry.type === 'dir') {
            switch (dbEntry.action) {
                case SyncEvents.NEW:
                    console.log('Sync request [DIR][NEW]: ', dbEntry.path, dbEntry.user);

                    clientStats.socket.emit('message', {
                        username: dbEntry.user,
                        type: SyncMessages.newFolder,
                        path: dbEntry.path,
                        dbEntry: dbEntry
                    });

                    break;

                case SyncEvents.RENAME:
                    console.log('Sync request [DIR][RENAME]: ', dbEntry.oldPath, ' --> ', dbEntry.path);

                    clientStats.socket.emit('message', {
                        username: dbEntry.user,
                        type: SyncMessages.renameFolder,
                        path: dbEntry.path,
                        oldPath: dbEntry.oldPath,
                        current_cs: dbEntry.current_cs,
                        dbEntry: dbEntry
                    });

                    break;

                case SyncEvents.DELETE:
                    console.log('Sync request [DIR][DELETE]: ', dbEntry.path);

                    clientStats.socket.emit('message', {
                        username: dbEntry.user,
                        type: SyncMessages.deleteFolder,
                        path: dbEntry.path,
                        dbEntry: dbEntry
                    });

                    break;

            }
        }
    }

    async onResponse(clientStats, response) {
        const dbEntry = response.dbEntry;
        const fullPath = path.resolve(process.env.PD_FOLDER_PATH, dbEntry.user, dbEntry.path);
        const writeStream = ss.createStream();

        switch (response.action) {
            case SyncActions.justCopy:
                console.log('Sync response [FILE][JUST_COPY]: ', dbEntry.path);

                if (checkExistence(fullPath)) {
                    ss(clientStats.socket).emit('file', writeStream, {path: dbEntry.path});
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

                ss(clientStats.socket).emit('transmissionData', writeStream, {path: dbEntry.path});
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

                ss(clientStats.socket).emit('file', writeStream, {path: newPath});
                fs.createReadStream(fullNewPath).pipe(writeStream);

                writeStream.on('finish', () => {
                    console.log('Conflicted file copied : ' + response);
                    deleteMetadataEntry(dbEntry.sequence_id);
                    setSyncedChecksum(newPath, dbEntry.current_cs);
                });

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

    async syncNewDirectory(clientStats, username, targetPath) {
        clientStats.serializeLock++;
        // TODO: Recheck for folder names with dots.

        clientStats.socket.emit('action', {
            type: SyncActionMessages.newFolder,
            path: targetPath,
            username: username,
            sourcePath: sourcePath
        });

        clientStats.serializeLock--;
    }

    async doSync(clientStats, callBack) {
        clientStats.serializeLock = 0;

        await MetadataDBHandler.getChangesOfUser(clientStats.username).then(async (changes) => {
            changes = changes.data;
            let i = 0;

            const intervalId = setInterval(async () => {
                if (clientStats.serializeLock === 0) {
                    if (i < changes.length) {
                        await this.sendSyncRequest(clientStats, changes[i++]);
                    }
                    else {
                        clearInterval(intervalId);
                        callBack(clientStats['socket'], {type: 'serverToPdSync'});
                    }
                }
            }, 500);

        });
    }

    callBack(socket, data) {
        socket.emit('callBack', data);
    }

}