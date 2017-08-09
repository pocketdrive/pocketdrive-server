/**
 * Created by pamoda on 8/7/17.
 */
import {Inotify} from 'inotify';
import fs from 'fs';
import path from 'path';
import * as _ from 'lodash';

const p = console.log;
import MetadataDBHandler from '../db/file-metadata-db';
import * as fileMeta from '../utils/meta-data';

const metaDB = new MetadataDBHandler();
const inotify = new Inotify();

export default class FileSystemEventListener {

    constructor(username, folder) {
        // TODO create directory by environment
        // For each users sync directory start the watcher
        this.pdPath = process.env.PD_FOLDER_PATH;
        this.baseDirectory = path.resolve(this.pdPath, username, folder);
        p(this.baseDirectory);
        this.hashtable = {};
        this.data = {};
    }

    freshStart() {
        this.addWatch(this.baseDirectory);
        let directory_child = this.scandirSync(this.baseDirectory);
        if (directory_child.length !== 0) {
            for (let i = 0, len = directory_child.length; i < len; i++) {
                this.addWatch(directory_child[i]);
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
        const watch_fd = inotify.addWatch(watch);

        this.hashtable[watch_fd] = directory;

        return watch_fd;
    }

    inotifyCallback(event) {
        let mask = event.mask;
        let isDirectory = mask & Inotify.IN_ISDIR;
        let isTempFile = false;
        let fullpath, type;

        if (event.name) {
            isTempFile = ((event.name).startsWith('.'));
        }

        type = isDirectory ? 'directory ' : 'file ';
        event.name ? type += ' ' + event.name + ' ' : ' ';
        fullpath = path.resolve(this.hashtable[event.watch], _.get(event, 'name', ''));

        if (mask & Inotify.IN_MODIFY) {
            if (!isTempFile) {
                metaDB.updateMetadata(fullpath, fileMeta.getFileMetadata(fullpath));
                console.log('File modified: ' + fullpath);
            }
        } else if (mask & Inotify.IN_CREATE) {
            if (isDirectory) {
                console.log('Directory for watch: ' + fullpath);
                this.addWatch(fullpath);
            }
            else if (!isTempFile) {
                metaDB.insertMetadata(fileMeta.getFileMetadata(fullpath));
                console.log('New file created: ' + fullpath);
            }
        } else if (mask & Inotify.IN_DELETE) {
            if (isDirectory) {
                this.deleteHashtable(fullpath);
                console.log('Directory Deleted: ' + fullpath);
            }
            else if (!isTempFile) {
                console.log('File Deleted: ' + fullpath);
                metaDB.deleteMetadata(fullpath);

            }
        } else if (mask & Inotify.IN_MOVED_FROM) {
            this.data = event;
            this.data.type = type;
            this.data.path = fullpath;

            if (isTempFile) {
                this.data.temp = true;
            }
        } else if (mask & Inotify.IN_MOVED_TO) {
            if (Object.keys(this.data).length &&
                this.data.cookie === event.cookie) {

                if (isDirectory) {
                    this.addWatch(fullpath);
                    metaDB.updateMetadataForRenaming(this.data.path, fullpath, isDirectory);
                    console.log('Directory Renamed:');
                    console.log('   Old path:' + this.data.path);
                    console.log('   New path:' + fullpath);

                }
                else {
                    if (this.data.temp) {
                        metaDB.updateMetadata(fullpath, fileMeta.getFileMetadata(fullpath));
                        console.log('File modified :' + fullpath);
                    }
                    else {
                        metaDB.updateMetadataForRenaming(this.data.path, fullpath, isDirectory);
                        console.log('File renamed');
                        console.log('   Old path:' + this.data.path);
                        console.log('   New path:' + fullpath);
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