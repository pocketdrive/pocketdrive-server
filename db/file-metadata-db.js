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
    addNewFolder(username, syncPath) {
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
    addNewFile(username, fullPath) {
        databases.fileMetaDataDb.insert(metaUtils.getFileMetadata(username, fullPath), (err, doc) => {
            if (err) {
                console.log("could not insert : " + err);
            }
            else {
                console.log('Inserted : ', doc.path, 'with ID', doc._id);
            }
        });
    }

    /**
     * Update the current checksum field of an existing entry.
     *
     * @param fullPath - absolute path to the file
     * @param checkSum - New checksum value to insert
     */
    updateCurrentCheckSum(fullPath, checkSum) {
        const path = _.replace(fullPath, process.env.PD_FOLDER_PATH, '');

        databases.fileMetaDataDb.update({path: path}, {$set: {current_cs: checkSum}}, {}, (err, numReplaced) => {
            if (!err) {
                console.log(numReplaced + " entries updated");
            }
        });
    }

    /**
     * Update the path filed of existing entries when renamed.
     *
     * @param oldPath - Old path of the renamed renamed item.
     * @param newPath - New path of the renamed renamed item.
     * @param isDirectory - True if the item is a directory. Else false.
     */
    updateMetadataForRenaming(oldPath, newPath, isDirectory) {
        const tempOldPath = _.replace(oldPath, process.env.PD_FOLDER_PATH, '');
        const tempNewPath = _.replace(newPath, process.env.PD_FOLDER_PATH, '');

        if (isDirectory) {
            let regex = new RegExp(tempOldPath);

            databases.fileMetaDataDb.find({path: {$regex: regex}}, (err, docs) => {
                _.each(docs, (doc) => {
                    const path = (doc.path).replace(regex, tempNewPath);

                    databases.fileMetaDataDb.update({path: doc.path}, {$set: {path: path}}, {}, (err, numReplaced) => {
                        if (!err) {
                            console.log(numReplaced + " entries updated");
                        }
                    });
                });
            });
        }
        else {
            console.log('search key ', oldPath);
            databases.fileMetaDataDb.update({path: tempOldPath}, {$set: {path: tempNewPath}}, {}, (err, numReplaced) => {
                if (!err) {
                    console.log(numReplaced + " entries updated");
                }
            });
        }
    }

    /**
     * Delete single file from meta data DB.
     *
     * @param fullPath - Absolute path of the file
     */
    deleteFile(fullPath) {
        const tempPath = _.replace(fullPath, process.env.PD_FOLDER_PATH, '');

        databases.fileMetaDataDb.remove({path: tempPath}, (err, numDeleted) => {
            if (err) {
                console.log(err);
            }
            else {
                console.log('Deleted', numDeleted, 'files');
            }
        });
    }

    findMetadata(path) {
        databases.fileMetaDataDb.findOne({path: path}, (err, doc) => {
            if (err) {
                console.log(err);
            } else {
                console.log('File found: ', doc.path);
            }
        });
    }

    removeFilesFromSync(username, syncPath) {
        const directory = path.resolve(process.env.PD_FOLDER_PATH, username, syncPath);
        const fileList = metaUtils.getFileList(directory);

        let tempPath;

        _.each(fileList, (file) => {
            tempPath = _.replace(file, process.env.PD_FOLDER_PATH, '');
            databases.fileMetaDataDb.remove({path: tempPath}, {}, () => {
            });
        });
    }
}