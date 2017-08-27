import {Inotify} from 'inotify';
import fs from 'fs';
import path from 'path';
import * as _ from 'lodash';

import {SyncEvents} from '../sync-engine/sync-constants';

import MetadataDBHandler from '../db/file-metadata-db';
import ChecksumDBHandler from "../db/checksum-db";
import * as metaUtils from '../utils/meta-data';

const inotify = new Inotify();

/**
 * @author Pamoda Wimalasiri
 * @author Dulaj Atapattu
 */
export default class FileSystemEventListener {

    constructor(username, folder, deviceIDs) {
        // TODO create directory by environment
        // For each users sync directory start the watcher
        this.pdPath = process.env.PD_FOLDER_PATH;
        this.username = username;
        this.deviceIDs = deviceIDs;
        this.baseDirectory = path.resolve(this.pdPath, username, folder);
        this.hashtable = {};
        this.data = {};
    }

    async start() {
        await MetadataDBHandler.getNextSequenceID().then((result) => {
            this.sequenceID = result.data;
        });

        this.addWatch(this.baseDirectory);
        let directory_child = this.scanDirSync(this.baseDirectory);
        if (directory_child.length !== 0) {
            for (let i = 0, len = directory_child.length; i < len; i++) {
                this.addWatch(directory_child[i]);
            }
        }

        return this;
    }

    stop() {
        for (let key in this.hashtable) {
            if (this.hashtable.hasOwnProperty(key)) {
                delete this.hashtable[key];
                inotify.removeWatch(key);
            }
        }
    }

    addWatch(directory) {
        console.log('Added watch for ' + directory);
        const watch = {
            path: directory,
            watch_for: Inotify.IN_ALL_EVENTS,
            callback: this.inotifyCallback.bind(this)
        };

        const watch_id = inotify.addWatch(watch);
        this.hashtable[watch_id] = directory;

    }

    async inotifyCallback(event) {
        let mask = event.mask;
        let isDirectory = mask & Inotify.IN_ISDIR;
        let isTempFile = false;
        let fullPath, type;

        if (event.name) {
            isTempFile = ((event.name).startsWith('.'));
        }

        type = isDirectory ? 'dir' : 'file';
        // event.name ? type += ' ' + event.name + ' ' : ' ';
        fullPath = path.resolve(this.hashtable[event.watch], _.get(event, 'name', ''));

        if (mask & Inotify.IN_MODIFY) {
            if (!isTempFile) {
                MetadataDBHandler.updateEntry(fullPath, {
                    action: SyncEvents.MODIFY,
                    user: this.username,
                    deviceIDs: this.deviceIDs,
                    path: _.replace(fullPath, process.env.PD_FOLDER_PATH, ''),
                    type: type,
                    current_cs: metaUtils.getCheckSum(fullPath),
                    sequenceID: this.sequenceID++
                });

                console.log(type + ' modified: ' + fullPath);
            }

        } else if (mask & Inotify.IN_CREATE) {
            if (isDirectory) {
                console.log('New directory for watch: ' + fullPath);
                this.addWatch(fullPath);
            }

            if (!isTempFile) {
                MetadataDBHandler.updateEntry(fullPath, {
                    action: SyncEvents.NEW,
                    user: this.username,
                    deviceIDs: this.deviceIDs,
                    path: _.replace(fullPath, process.env.PD_FOLDER_PATH, ''),
                    type: type,
                    current_cs: metaUtils.getCheckSum(fullPath),
                    sequenceID: this.sequenceID++
                });

                console.log('New ' + type + ' created: ' + fullPath);
            }

        } else if (mask & Inotify.IN_DELETE) {
            // TODO: Only shift delete works
            if (isDirectory) {
                this.deleteFromHashTableByDirectory(fullPath);
                MetadataDBHandler.removeFilesOfDeletedDirectory(fullPath);
                console.log('Removed watch for : ' + fullPath);
            }

            if (!isTempFile) {
                let current_cs = '';

                await MetadataDBHandler.readEntry(fullPath).then(async (result) => {
                    if (result.success && result.data.current_cs) {
                        current_cs = result.data.current_cs;
                    } else {
                        await ChecksumDBHandler.getChecksum(this.username,_.replace(fullPath, process.env.PD_FOLDER_PATH, '')).then((result) => {
                            if(result.success){
                                current_cs = result.data;
                            }
                        })
                    }
                });

                MetadataDBHandler.updateEntry(fullPath, {
                    action: SyncEvents.DELETE,
                    user: this.username,
                    deviceIDs: this.deviceIDs,
                    path: _.replace(fullPath, process.env.PD_FOLDER_PATH, ''),
                    type: type,
                    current_cs: current_cs,
                    sequenceID: this.sequenceID++
                });

                console.log(type + ' Deleted: ' + fullPath);
            }

        } else if (mask & Inotify.IN_MOVED_FROM) {
            this.data = event;
            this.data.type = type;
            this.data.path = fullPath;

            if (isTempFile) {
                this.data.temp = true;
            }

        } else if (mask & Inotify.IN_MOVED_TO) {
            if (Object.keys(this.data).length &&
                this.data.cookie === event.cookie) {

                let oldPath = this.data.path;

                if (isDirectory) {
                    this.addWatch(fullPath);

                    MetadataDBHandler.updateEntry(oldPath, {
                        action: SyncEvents.RENAME,
                        user: this.username,
                        deviceIDs: this.deviceIDs,
                        path: _.replace(fullPath, process.env.PD_FOLDER_PATH, ''),
                        type: type,
                        oldPath: _.replace(oldPath, process.env.PD_FOLDER_PATH, ''),
                        sequenceID: this.sequenceID++
                    });

                    console.log('Directory Renamed:');
                    console.log('   Old path:' + oldPath);
                    console.log('   New path:' + fullPath);

                }
                else {
                    if (this.data.temp) {
                        MetadataDBHandler.updateEntry(fullPath, {
                            action: SyncEvents.MODIFY,
                            user: this.username,
                            deviceIDs: this.deviceIDs,
                            path: _.replace(fullPath, process.env.PD_FOLDER_PATH, ''),
                            type: type,
                            current_cs: metaUtils.getCheckSum(fullPath),
                            sequenceID: this.sequenceID++
                        });

                        console.log('File modified 2:' + fullPath);

                    } else {
                        MetadataDBHandler.updateEntry(oldPath, {
                            action: SyncEvents.RENAME,
                            user: this.username,
                            deviceIDs: this.deviceIDs,
                            path: _.replace(fullPath, process.env.PD_FOLDER_PATH, ''),
                            type: type,
                            oldPath: _.replace(oldPath, process.env.PD_FOLDER_PATH, ''),
                            sequenceID: this.sequenceID++
                        });

                        console.log('File renamed');
                        console.log('   Old path:' + oldPath);
                        console.log('   New path:' + fullPath);
                    }
                }

                this.data = {};
            }
        }
    }

    scanDirSync(directory) {
        let files = fs.readdirSync(directory);
        let directories = [];
        for (let file in files) {

            if (!files.hasOwnProperty(file)) {
                continue;
            }

            let name = path.normalize(directory + '/' + files[file]);

            if (fs.statSync(name).isDirectory()) {
                console.log(' [scandir] Directory: ' + name);
                directories.push(name);
                directories = directories.concat(this.scanDirSync(name));
            }
        }
        return directories;
    }

    deleteFromHashTableByDirectory(directory) {
        for (let key in this.hashtable) {
            if (this.hashtable.hasOwnProperty(key)) {
                if (this.hashtable[key] === directory) {
                    delete this.hashtable[key];
                }
            }
        }
    }

}