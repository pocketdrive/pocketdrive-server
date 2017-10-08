import path from 'path';
import * as _ from 'lodash';

import * as databases from '../db/dbs';
import * as metaUtils from '../utils/meta-data';

/**
 * Database helper class to manage synced file meta data DB.
 *
 * @author Pamoda Wimalasiri
 * @author Dulaj Atapattu
 * @author Anuradha Wickramarachchi
 */
export default class NisDBHandler {

    /**
     * Register a new folder to sync. All files are added to the database recursively.
     *
     * @param username - Username of the folder owner
     * @param syncPath - Relative path of the folder to sync
     */
    static addNewFolder(username, syncPath) {
        const directory = path.resolve(process.env.PD_FOLDER_PATH, username, syncPath);
        const fileList = metaUtils.getFileList(directory);

        _.each(fileList, (file) => {
            databases.nisDb.insert(metaUtils.getFileMetadata(username, file));
        });
    }

    /**
     * Add new single file to sync.
     *
     * @param username - Username of the file owner
     * @param fullPath - Absolute path to the file
     */
    static addNewFile(username, fullPath) {
        const entry = metaUtils.getFileMetadata(username, fullPath);
        databases.nisDb.update({path: entry.path}, entry, {upsert: true}, (err, doc) => {
            if (err) {
                console.log("could not insert : " + err);
            }
            else {
                console.log('Inserted');
            }
        });
    }

    static insertEntry(entry) {
        databases.nisDb.insert(entry, (err) => {
        });
    }

    static updateEntry(userName, relativePath, updateEntry) {
        databases.nisDb.update({
            user: userName,
            path: relativePath
        }, updateEntry, {upsert: true}, (err, numReplaced) => {
        });
    }

    static deleteEntryById(_id) {
        databases.nisDb.remove({_id: _id}, {}, (err, numRemoved) => {
        });
    }

    static readEntry(fullPath) {
        let result = {success: false};
        const path = _.replace(fullPath, process.env.PD_FOLDER_PATH, '');

        return new Promise((resolve) => {
            databases.nisDb.findOne({path: path}, (err, doc) => {
                if (err) {
                    this.handleError(result, 'RDatabase error!. Read entry failed', err);
                } else {
                    result.success = true;
                    result.data = doc ? doc : {};
                }

                resolve(result);
            });
        });
    }

    /**
     * Update the current checksum field of an existing entry.
     *
     * @param fullPath - absolute path to the file
     * @param checkSum - New checksum value to insert
     */
    static updateCurrentCheckSum(fullPath, checkSum) {
        const path = _.replace(fullPath, process.env.PD_FOLDER_PATH, '');

        databases.nisDb.update({path: path}, {$set: {current_cs: checkSum}}, {}, (err, numReplaced) => {
        });
    }

    /**
     * Update the path field of existing entries when renamed.
     *
     * @param oldPath - Old path of the renamed renamed item.
     * @param newPath - New path of the renamed renamed item.
     */
    static updateMetadataForRenaming(oldPath, newPath) {
        let regex = new RegExp(oldPath);

        databases.nisDb.find({path: {$regex: regex}}, (err, docs) => {
            _.each(docs, (doc) => {
                const newPath = (doc.path).replace(regex, newPath);

                doc.oldPath = doc.path;
                doc.path = newPath;

                databases.nisDb.update({path: doc.oldPath}, doc, {}, (err, numReplaced) => {
                });
            });
        });
    }

    static removeFilesOfDeletedDirectory(fullPath) {
        const path = _.replace(fullPath, process.env.PD_FOLDER_PATH, '');

        let regex = new RegExp(path);

        databases.nisDb.find({path: {$regex: regex}}, (err, docs) => {
            _.each(docs, (doc) => {
                databases.nisDb.remove(doc, (err, numDeleted) => {
                    if (err) {
                        console.log(err);
                    }
                });
            });
        });
    }

    /**
     * Delete single file from meta data DB.
     *
     * @param path - Absolute path of the file
     */
    static deleteEntry(path) {
        databases.nisDb.remove({path: path}, (err, numDeleted) => {
            if (err) {
                console.log(err);
            }
        });
    }

    static deleteEntryBySequenceId(sequenceID) {
        databases.nisDb.remove({sequence_id: sequenceID}, (err, numDeleted) => {
        });
    }

    static getChangesOfUser(username) {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.nisDb.find({user: username}).sort({sequence_id: 1}).exec((err, docs) => {
                if (err) {
                    this.handleError(result, 'DB Error. Cannot read meta data', err);
                } else {
                    result.success = true;
                    result.data = docs;
                }

                resolve(result);
            });
        });
    }

    static getNextSequenceID() {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.nisDb.find({}).sort({sequence_id: -1}).limit(1).exec((err, docs) => {
                if (err) {
                    this.handleError(result, 'DB Error. Cannot get max sequenceID', err);
                } else {
                    result.success = true;
                    result.data = (docs && docs.length !== 0) ? docs[0].sequence_id + 1 : 0;
                }

                resolve(result);

            });
        });
    }

    static getAllEvents() {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.nisDb.find({}).sort({sequence_id: 1}).exec((err, docs) => {
                if (err) {
                    this.handleError(result, 'DB Error. Cannot get max sequenceID', err);
                } else {
                    result.success = true;
                    result.data = docs;
                }

                resolve(result);

            });
        });
    }

    static findMetadata(path) {
        databases.nisDb.findOne({path: path}, (err, doc) => {
            if (err) {
                console.log(err);
            } else {
                console.log('File found: ', doc.path);
            }
        });
    }

    static removeFilesFromSync(username, syncPath) {
        const directory = path.resolve(process.env.PD_FOLDER_PATH, username, syncPath);
        const fileList = metaUtils.getFileList(directory);

        let tempPath;

        _.each(fileList, (file) => {
            tempPath = _.replace(file, process.env.PD_FOLDER_PATH, '');
            databases.nisDb.remove({path: tempPath}, {}, () => {
            });
        });
    }

    static handleError(result, msg, err) {
        if (arguments.length === 3) {
            console.error(msg, err);
        } else {
            console.error(msg);
        }
        result.error = msg;
    }
}