import {SyncEvents} from "./sync-constants";

import fsmonitor from 'fsmonitor';
import path from 'path';
import * as _ from 'lodash';

import MetadataDBHandler from '../db/sync-meta-db';
import * as metaUtils from '../utils/meta-data';
import {getFolderChecksum} from "./sync-actions";
import ChecksumDBHandler from "../db/checksum-db";
import {SyncRunner} from "./sync-runner";

export const ChangeType = {FILE: 'file', DIR: 'dir'};

/**
 * @author Pamoda Wimalasiri
 * @author Dulaj Atapattu
 */
export default class FileSystemEventListener {

    constructor(username, folder, deviceIDs) {
        this.pdPath = process.env.PD_FOLDER_PATH;
        this.username = username;
        this.deviceIDs = deviceIDs;
        this.folder = folder;

        this.pathPrefix = path.resolve(this.pdPath, this.username);
        this.pathPrefix += '/'; // TODO: Append system file separator
        this.baseDirectory = path.resolve(this.pathPrefix, this.folder);
        this.hashtable = {};
        this.data = {};
        this.changes = [];
        this.serializeLock = 0;

        MetadataDBHandler.getNextSequenceID().then((result) => {
            this.sequenceID = result.data;
        });
    }

    start() {
        // noinspection JSUnusedLocalSymbols
        this.monitor = fsmonitor.watch(this.baseDirectory, {
            matches: function (relPath) {
                return relPath.match(/(\/\.)|(\\\.)|^(\.)/) === null;
            },
            excludes: function (relPath) {
                return false;
            }
        });

        console.log('Watch ', this.baseDirectory);

        this.monitor.on('change', async (change) => {
            this.changes.push(change);

            if (this.serializeLock === 0) {
                this.consume(this.changes.shift());
            }
        });
    }

    async consume(change) {
        this.serializeLock++;
        clearTimeout(SyncRunner.eventListeners[this.username].timeOutId);
        SyncRunner.eventListeners[this.username].isWatcherRunning = true;

        // Change watcher relative paths to absolute paths
        _.each(change, (changeList, changeListName) => {
            _.each(changeList, (relativePath, index) => {
                change[changeListName][index] = path.join(this.baseDirectory, relativePath);
            });
        });

        if (change.addedFolders.length > 0 && change.addedFolders.length === change.removedFolders.length) {
            // Rename directory
            console.log("Watcher [DIR][RENAME] ", change.removedFolders[0], ' --> ', change.addedFolders[0]);

            const newPath = _.replace(change.addedFolders[0], this.pathPrefix, '');
            const oldPath = _.replace(change.removedFolders[0], this.pathPrefix, '');

            ChecksumDBHandler.updateFilePathsAfterRename(oldPath, newPath);

            MetadataDBHandler.insertEntry({
                action: SyncEvents.RENAME,
                user: this.username,
                deviceIDs: this.deviceIDs,
                path: newPath,
                type: ChangeType.DIR,
                current_cs: await getFolderChecksum(change.addedFolders[0]),
                oldPath: oldPath,
                sequence_id: this.sequenceID++
            });

        } else if (change.addedFiles.length === 1 && change.removedFiles.length === 1) {
            // Rename file
            console.log("Watcher [FILE][RENAME] ", change.removedFiles[0], ' --> ', change.addedFiles[0]);

            const newPath = _.replace(change.addedFiles[0], this.pathPrefix, '');
            const oldPath = _.replace(change.removedFiles[0], this.pathPrefix, '');

            MetadataDBHandler.updateEntry(this.username, oldPath, {
                action: SyncEvents.RENAME,
                user: this.username,
                deviceIDs: this.deviceIDs,
                type: ChangeType.FILE,
                path: newPath,
                oldPath: oldPath,
                current_cs: metaUtils.getCheckSum(change.addedFiles[0]),
                sequence_id: this.sequenceID++
            });

        } else {
            // New directory
            for (let i = 0; i < change.addedFolders.length; i++) {
                console.log("Watcher [DIR][NEW] ", change.addedFolders[i]);

                MetadataDBHandler.insertEntry({
                    action: SyncEvents.NEW,
                    user: this.username,
                    deviceIDs: this.deviceIDs,
                    path: _.replace(change.addedFolders[i], this.pathPrefix, ''),
                    type: ChangeType.DIR,
                    current_cs: await getFolderChecksum(change.addedFolders[i]),
                    sequence_id: this.sequenceID++
                });
            }

            // New file
            for (let i = 0; i < change.addedFiles.length; i++) {
                console.log("Watcher [FILE][NEW] ", change.addedFiles[i]);

                const newPath = _.replace(change.addedFiles[i], this.pathPrefix, '');

                MetadataDBHandler.updateEntry(this.username, newPath, {
                    action: SyncEvents.NEW,
                    user: this.username,
                    deviceIDs: this.deviceIDs,
                    path: newPath,
                    type: ChangeType.FILE,
                    current_cs: metaUtils.getCheckSum(change.addedFiles[i]),
                    sequence_id: this.sequenceID++
                });
            }

            // Delete files
            for (let i = change.removedFiles.length - 1; i > -1; i--) {
                console.log("Watch [FILE][DELETE] ", change.removedFiles[i]);

                const newPath = _.replace(change.removedFiles[i], this.pathPrefix, '');

                MetadataDBHandler.updateEntry(this.username, newPath, {
                    action: SyncEvents.DELETE,
                    user: this.username,
                    deviceIDs: this.deviceIDs,
                    path: newPath,
                    type: ChangeType.FILE,
                    sequence_id: this.sequenceID++
                });
            }

            // Delete directories
            for (let i = change.removedFolders.length - 1; i > -1; i--) {
                console.log("Watch [DIR][DELETE] ", change.removedFolders[i]);

                const newPath = _.replace(change.removedFolders[i], this.pathPrefix, '');

                MetadataDBHandler.updateEntry(this.username, newPath, {
                    action: SyncEvents.DELETE,
                    user: this.username,
                    deviceIDs: this.deviceIDs,
                    path: newPath,
                    type: ChangeType.DIR,
                    sequence_id: this.sequenceID++
                });
            }

            // Modify file
            for (let i = 0; i < (change.modifiedFiles).length; i++) {
                console.log("Watch [FILE][MODIFY]  ", change.modifiedFiles[i]);

                const newPath = _.replace(change.modifiedFiles[i], this.pathPrefix, '');

                MetadataDBHandler.updateEntry(this.username, newPath, {
                    action: SyncEvents.MODIFY,
                    user: this.username,
                    deviceIDs: this.deviceIDs,
                    path: newPath,
                    type: ChangeType.FILE,
                    current_cs: metaUtils.getCheckSum(change.modifiedFiles[i]),
                    sequence_id: this.sequenceID++
                });
            }

        }

        if (this.changes.length > 0) {
            this.consume(this.changes.shift());
        } else {
            SyncRunner.eventListeners[this.username].timeOutId = setTimeout(() => {
                SyncRunner.eventListeners[this.username].isWatcherRunning = false;
            }, 5000);
        }

        this.serializeLock--;

    }

    stop() {
        this.monitor.close();
        console.log('Unwatch ', this.baseDirectory);
    }
}