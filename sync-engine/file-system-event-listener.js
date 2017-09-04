import {SyncEvents} from "./sync-constants";

import fsmonitor from 'fsmonitor';
import path from 'path';
import * as _ from 'lodash';

import MetadataDBHandler from '../db/file-metadata-db';
import * as metaUtils from '../utils/meta-data';
import {getFolderChecksum} from "./sync-actions";

const log = console.log;

export const ChangeType = {FILE: 'FILE', DIR: 'DIR'};

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

        this.baseDirectory = path.resolve(this.pdPath, this.username, this.folder);
        this.hashtable = {};
        this.data = {};
    }

    start() {
        // noinspection JSUnusedLocalSymbols
        let monitor = fsmonitor.watch(this.baseDirectory, {
            matches: function (relPath) {
                return relPath.match(/(\/\.)|(\\\.)|^(\.)/) === null;
            },
            excludes: function (relPath) {
                return false;
            }
        });

        console.log('Add watch ', this.baseDirectory);

        monitor.on('change', async (change) => {
            // Change watcher relative paths to absolute paths
            _.each(change, (changeList, changeListName) => {
                _.each(changeList, (relativePath, index) => {
                    change[changeListName][index] = path.join(this.baseDirectory, relativePath);
                });
            });

            if (change.addedFolders.length > 0 && change.addedFolders.length === change.removedFolders.length) {
                // Rename directory
                console.log("Watcher [DIR][RENAME] ", change.removedFolders[0], ' --> ', change.addedFolders[0]);

                MetadataDBHandler.insertEntry({
                    action: SyncEvents.RENAME,
                    user: this.username,
                    deviceIDs: this.deviceIDs,
                    path: _.replace(change.addedFolders[0], process.env.PD_FOLDER_PATH, ''),
                    type: ChangeType.DIR,
                    current_cs: await getFolderChecksum(change.addedFolders[0]),
                    oldPath: _.replace(change.removedFolders[0], process.env.PD_FOLDER_PATH, ''),
                    sequence_id: this.sequenceID++
                });

            } else if (change.addedFiles.length === 1 && change.removedFiles.length === 1) {
                // Rename file
                console.log("Watcher [FILE][RENAME] ", change.removedFiles[0], ' --> ', change.addedFiles[0]);

                MetadataDBHandler.updateEntry(change.addedFiles[0], {
                    action: SyncEvents.RENAME,
                    user: this.username,
                    deviceIDs: this.deviceIDs,
                    type: ChangeType.FILE,
                    path: _.replace(change.addedFiles[0], process.env.PD_FOLDER_PATH, ''),
                    oldPath: _.replace(change.removedFiles[0], process.env.PD_FOLDER_PATH, ''),
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
                        path: _.replace(change.addedFolders[i], process.env.PD_FOLDER_PATH, ''),
                        type: ChangeType.DIR,
                        current_cs: await getFolderChecksum(change.addedFolders[i]),
                        sequence_id: this.sequenceID++
                    });
                }

                // New file
                for (let i = 0; i < change.addedFiles.length; i++) {
                    console.log("Watcher [FILE][NEW] ", change.addedFiles[i]);

                    MetadataDBHandler.updateEntry(change.addedFiles[i], {
                        action: SyncEvents.NEW,
                        user: this.username,
                        deviceIDs: this.deviceIDs,
                        path: _.replace(change.addedFiles[i], process.env.PD_FOLDER_PATH, ''),
                        type: ChangeType.FILE,
                        current_cs: metaUtils.getCheckSum(change.addedFiles[i]),
                        sequence_id: this.sequenceID++
                    });
                }

                // Delete files
                for (let i = 0; i < change.removedFiles.length; i++) {
                    console.log("Watch [FILE][DELETE] ", change.removedFiles[i]);

                    MetadataDBHandler.updateEntry(change.removedFiles[i], {
                        action: SyncEvents.DELETE,
                        user: this.username,
                        deviceIDs: this.deviceIDs,
                        path: _.replace(change.removedFiles[i], process.env.PD_FOLDER_PATH, ''),
                        type: ChangeType.FILE,
                        sequence_id: this.sequenceID++
                    });
                }

                // Delete directories
                for (let i = 0; i < (change.removedFolders).length; i++) {
                    console.log("Watch [DIR][DELETE] ", change.removedFolders[i]);

                    MetadataDBHandler.updateEntry(change.removedFolders[i], {
                        action: SyncEvents.DELETE,
                        user: this.username,
                        deviceIDs: this.deviceIDs,
                        path: _.replace(change.removedFolders[i], process.env.PD_FOLDER_PATH, ''),
                        type: ChangeType.DIR,
                        sequence_id: this.sequenceID++
                    });
                }


                // Modify file
                for (let i = 0; i < (change.modifiedFiles).length; i++) {
                    console.log("Watch [FILE][MODIFY]  ", change.modifiedFiles[i]);

                    MetadataDBHandler.updateEntry(change.modifiedFiles[i], {
                        action: SyncEvents.MODIFY,
                        user: this.username,
                        deviceIDs: this.deviceIDs,
                        path: _.replace(change.modifiedFiles[i], process.env.PD_FOLDER_PATH, ''),
                        type: ChangeType.FILE,
                        current_cs: metaUtils.getCheckSum(change.modifiedFiles[i]),
                        sequence_id: this.sequenceID++
                    });
                }

                /*//handle dir modifications
                if ((change.modifiedFolders).length > 0) {
                    for (let i = 0; i < (change.modifiedFolders).length; i++) {
                        console.log("DIR MODIFIED ", change.modifiedFolders[i]);
                        // TODO : dir modify make DB entry
                        let entry = {
                            action: "MODIFY",
                            type: "dir",
                            path: change.modifiedFolders[i]
                        };
                    }
                }*/
            }
        });
    }
}