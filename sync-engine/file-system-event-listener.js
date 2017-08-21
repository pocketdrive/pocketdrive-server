import {Inotify} from 'inotify';
import fs from 'fs';
import path from 'path';
import * as _ from 'lodash';

const p = console.log;
import MetadataDBHandler from '../db/file-metadata-db';
import * as metaUtils from '../utils/meta-data';
import {error} from "../communicator/peer-messages";

const metaDB = new MetadataDBHandler();
const inotify = new Inotify();
export const Actions = {NEW: 'NEW', MODIFY: 'MODIFY', DELETE: 'DELETE', RENAME: 'RENAME'};

// TODO: Clean and refactor this class @dulaj
/**
 * @author Pamoda Wimalasiri
 */
export default class FileSystemEventListener {

    constructor(username, folder) {
        // TODO create directory by environment
        // For each users sync directory start the watcher
        this.pdPath = process.env.PD_FOLDER_PATH;
        this.username = username;
        this.baseDirectory = path.resolve(this.pdPath, username, folder);
        p(this.baseDirectory);
        this.hashtable = {};
        this.data = {};

        metaDB.getNextSequenceID().then((result) => {
            this.sequenceID = result.data;
        })
    }

    start() {
        this.addWatch(this.baseDirectory);
        let directory_child = this.scandirSync(this.baseDirectory);
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
        console.log(' [add_Watch] Add new watch for ' + directory);
        const watch = {
            path: directory,
            watch_for: Inotify.IN_ALL_EVENTS,
            callback: this.inotifyCallback.bind(this)
        };

        const watch_id = inotify.addWatch(watch);
        this.hashtable[watch_id] = directory;

    }

    inotifyCallback(event) {
        let mask = event.mask;
        p(mask);
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
                metaDB.updateEntry(fullPath, {
                    action: Actions.MODIFY,
                    user: this.username,
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
                metaDB.updateEntry(fullPath, {
                    action: Actions.NEW,
                    user: this.username,
                    path: _.replace(fullPath, process.env.PD_FOLDER_PATH, ''),
                    type: type,
                    sequenceID: this.sequenceID++
                });

                console.log('New ' + type + ' created: ' + fullPath);
            }

        } else if (mask & Inotify.IN_DELETE) {
            // TODO: Only shift delete works
            if (isDirectory) {
                this.deleteFromHashTableByDirectory(fullPath);
                metaDB.removeFilesOfDeletedDirectory(fullPath);
                console.log('Directory removed from watch: ' + fullPath);
            }

            if (!isTempFile) {
                metaDB.updateEntry(fullPath, {
                    action: Actions.DELETE,
                    user: this.username,
                    path: _.replace(fullPath, process.env.PD_FOLDER_PATH, ''),
                    type: type,
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

                    metaDB.updateEntry(oldPath, {
                        action: Actions.RENAME,
                        user: this.username,
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
                        metaDB.updateEntry(fullPath, {
                            action: Actions.MODIFY,
                            user: this.username,
                            path: _.replace(fullPath, process.env.PD_FOLDER_PATH, ''),
                            type: type,
                            current_cs: metaUtils.getCheckSum(fullPath),
                            sequenceID: this.sequenceID++
                        });

                        console.log('File modified 2:' + fullPath);

                    } else {
                        metaDB.updateEntry(oldPath, {
                            action: Actions.RENAME,
                            user: this.username,
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

    scandirSync(directory) {
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
                directories = directories.concat(this.scandirSync(name));
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