import md5File from 'md5-file';
import fs from 'fs';
import path from 'path';
import * as _ from 'lodash';

import * as databases from './dbs';
import * as metaUtils from '../utils/meta-data';

/**
 * @author Pamoda Wimalasiri
 * @author Dulaj Atapattu
 */
export default class MetadataDBHandler {

    insertMetadata(entry) {
        entry.previous_cs = entry.new_cs;
        databases.fileMetaDataDb.insert(entry, (err, doc) => {
            if (err) {
                console.log("could not insert : " + err);
            }
            else {
                console.log('Inserted : ', doc.path, 'with ID', doc._id);
            }
        });
    }

    /*updateMetadata(path, entry) {
        const tempPath = _.replace(path, process.env.PD_FOLDER_PATH, '');

        /!*databases.fileMetaDataDb.findOne({path: tempPath}, (err, result) => {
            if (!err) {
                console.log('File found: ', JSON.stringify(result));
                entry.previous_cs = result ? result.new_cs : entry.new_cs;
                databases.fileMetaDataDb.update({path: tempPath}, {$set: entry}, {}, (err, numReplaced) => {
                    if (!err) {
                        console.log(numReplaced + " entries updated");
                    }
                });
            }
        });*!/

        databases.fileMetaDataDb.update({path: tempPath}, {$set: entry}, {}, (err, numReplaced) => {
            if (!err) {
                console.log(numReplaced + " entries updated");
            }
        });
    }*/

    updateCurrentCheckSum(fullPath, checkSum) {
        const path = _.replace(fullPath, process.env.PD_FOLDER_PATH, '');

        databases.fileMetaDataDb.update({path: path}, {$set: {current_cs: checkSum}}, {}, (err, numReplaced) => {
            if (!err) {
                console.log(numReplaced + " entries updated");
            }
        });
    }

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

    deleteMetadata(path) {
        const tempPath = _.replace(path, process.env.PD_FOLDER_PATH, '');

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

    addFilesToSync(username, syncPath) {
        const directory = path.resolve(process.env.PD_FOLDER_PATH, username, syncPath);
        const fileList = metaUtils.getFileList(directory);

        _.each(fileList, (file) => {
            databases.fileMetaDataDb.insert(metaUtils.getFileMetadata(username, file));
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