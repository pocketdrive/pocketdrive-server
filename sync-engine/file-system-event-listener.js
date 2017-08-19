import {Inotify} from 'inotify';
import fs from 'fs';
import path from 'path';
import * as _ from 'lodash';

const p = console.log;
import MetadataDBHandler from '../db/file-metadata-db';
import * as metaUtils from '../utils/meta-data';

const metaDB = new MetadataDBHandler();
const inotify = new Inotify();

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
        this.watchIDs = [];
    }

    start() {
        this.watchIDs.push(this.addWatch(this.baseDirectory));
        let directory_child = this.scandirSync(this.baseDirectory);
        if (directory_child.length !== 0) {
            for (let i = 0, len = directory_child.length; i < len; i++) {
                this.watchIDs.push(this.addWatch(directory_child[i]));
            }
        }

        return this;
    }

    stop() {
        _.each(this.watchIDs, (watchId) => {
            inotify.clearWatch(watchId)
        })
    }

    addWatch(directory) {
        console.log(' [add_Watch] Add new watch for ' + directory);
        const watch = {
            path: directory,
            watch_for: Inotify.IN_ALL_EVENTS,
            callback: this.inotifyCallback.bind(this)
        };
        const watch_fd = inotify.addWatch(watch);

        this.hashtable[watch_fd] = directory;

        return watch_fd;
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

        type = isDirectory ? 'directory ' : 'file ';
        event.name ? type += ' ' + event.name + ' ' : ' ';
        fullPath = path.resolve(this.hashtable[event.watch], _.get(event, 'name', ''));

        if (mask & Inotify.IN_MODIFY) {
            if (!isTempFile) {
                metaDB.updateCurrentCheckSum(fullPath, metaUtils.getCheckSum(fullPath));
                console.log('File modified: ' + fullPath);
            }
        } else if (mask & Inotify.IN_CREATE) {
            if (isDirectory) {
                console.log('Directory for watch: ' + fullPath);
                this.addWatch(fullPath);
            }
            else if (!isTempFile) {
                metaDB.insertMetadata(metaUtils.getFileMetadata(this.username, fullPath));
                console.log('New file created: ' + fullPath);
            }
        } else if (mask & Inotify.IN_DELETE) {
            if (isDirectory) {
                this.deleteHashtable(fullPath);
                console.log('Directory Deleted: ' + fullPath);
            }
            else if (!isTempFile) {
                console.log('File Deleted: ' + fullPath);
                metaDB.deleteMetadata(fullPath);

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

                if (isDirectory) {
                    this.addWatch(fullPath);
                    metaDB.updateMetadataForRenaming(this.data.path, fullPath, isDirectory);
                    console.log('Directory Renamed:');
                    console.log('   Old path:' + this.data.path);
                    console.log('   New path:' + fullPath);

                }
                else {
                    if (this.data.temp) {
                        metaDB.updateCurrentCheckSum(fullPath, metaUtils.getCheckSum(fullPath));
                        console.log('File modified :' + fullPath);
                    }
                    else {
                        metaDB.updateMetadataForRenaming(this.data.path, fullPath, isDirectory);
                        console.log('File renamed');
                        console.log('   Old path:' + this.data.path);
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

    deleteHashtable(value) {
        for (let key in this.hashtable) {
            if (this.hashtable.hasOwnProperty(key)) {
                if (this.hashtable[key] === value) {
                    delete this.hashtable[key];
                }
            }
        }
    }
}