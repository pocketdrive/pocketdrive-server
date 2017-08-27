import path from 'path';
import * as _ from 'lodash';

import * as databases from './dbs';
import * as metaUtils from '../utils/meta-data';

/**
 * Database helper class to manage synced file meta data DB.
 *
 * @author Pamoda Wimalasiri
 * @author Dulaj Atapattu
 */
export default class MetadataDBHandler {

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
            databases.fileMetaDataDb.insert(metaUtils.getFileMetadata(username, file));
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
        databases.fileMetaDataDb.update({path: entry.path}, entry, {upsert: true}, (err, doc) => {
            if (err) {
                console.log("could not insert : " + err);
            }
            else {
                console.log('Inserted');
            }
        });
    }

    static updateEntry(fullPath, updateEntry) {
        const path = _.replace(fullPath, process.env.PD_FOLDER_PATH, '');

        databases.fileMetaDataDb.update({path: path}, updateEntry, {upsert: true}, (err, numReplaced) => {
            if (!err) {
                console.log(numReplaced + " entries updated");
            }
        });
    }

    static readEntry(fullPath) {
        let result = {success: false};
        const path = _.replace(fullPath, process.env.PD_FOLDER_PATH, '');

        return new Promise((resolve) => {
            databases.fileMetaDataDb.findOne({path: path}, (err, doc) => {
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

        databases.fileMetaDataDb.update({path: path}, {$set: {current_cs: checkSum}}, {}, (err, numReplaced) => {
            if (!err) {
                console.log(numReplaced + " entries updated");
            }
        });
    }

    /**
     * Update the path field of existing entries when renamed.
     *
     * @param oldPath - Old path of the renamed renamed item.
     * @param newPath - New path of the renamed renamed item.
     * @param isDirectory - True if the item is a directory. Else false.
     */
    static updateMetadataForRenaming(oldPath, newPath, isDirectory) {
        const tempOldPath = _.replace(oldPath, process.env.PD_FOLDER_PATH, '');
        const tempNewPath = _.replace(newPath, process.env.PD_FOLDER_PATH, '');

        if (isDirectory) {
            let regex = new RegExp(tempOldPath);

            databases.fileMetaDataDb.find({path: {$regex: regex}}, (err, docs) => {
                _.each(docs, (doc) => {
                    const path = (doc.path).replace(regex, tempNewPath);

                    databases.fileMetaDataDb.update({path: doc.path}, {
                        $set: {
                            action: 'RENAME',
                            path: path,
                            oldPath: doc.path
                        }
                    }, {upsert: true}, (err, numReplaced) => {
                        if (!err) {
                            console.log(numReplaced + " entries updated");
                        }
                    });
                });
            });
        }
        else {
            console.log('search key ', oldPath);
            databases.fileMetaDataDb.update({path: tempOldPath}, {
                $set: {
                    action: 'RENAME',
                    path: tempNewPath,
                    oldPath: tempOldPath
                }
            }, {upsert: true}, (err, numReplaced) => {
                if (!err) {
                    console.log(numReplaced + " entries updated");
                }
            });
        }
    }

    static removeFilesOfDeletedDirectory(fullPath) {
        const path = _.replace(fullPath, process.env.PD_FOLDER_PATH, '');

        let regex = new RegExp(path);

        databases.fileMetaDataDb.find({path: {$regex: regex}}, (err, docs) => {
            _.each(docs, (doc) => {
                databases.fileMetaDataDb.remove(doc, (err, numDeleted) => {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        console.log('Deleted', numDeleted, 'files');
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
        databases.fileMetaDataDb.remove({path: path}, (err, numDeleted) => {
            if (err) {
                console.log(err);
            }
            else {
                console.log('Deleted', numDeleted, 'files');
            }
        });
    }

    static getUpdatedFilesOfUser(username) {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.fileMetaDataDb.find({user: username}).sort({sequenceID: 1}).exec((err, docs) => {
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
            databases.fileMetaDataDb.find({}).sort({sequenceID: -1}).limit(1).exec((err, docs) => {
                if (err) {
                    this.handleError(result, 'DB Error. Cannot get max sequenceID', err);
                } else {
                    result.success = true;
                    result.data = (docs && docs.length !== 0) ? docs[0].sequenceID + 1 : 0;
                }

                resolve(result);

            });
        });
    }

    static findMetadata(path) {
        databases.fileMetaDataDb.findOne({path: path}, (err, doc) => {
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
            databases.fileMetaDataDb.remove({path: tempPath}, {}, () => {
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