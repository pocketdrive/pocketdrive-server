/**
 * Created by pamoda on 8/7/17.
 */
import fs from 'fs';
import path from 'path';
import md5File from 'md5-file';

import * as databases from './dbs';

export default class MetadataDBHandler {
    insertMetadata(entry) {
        entry.previous_cs = entry.new_cs;
        databases.fileMetaDataDb.insert(entry, function (err, doc) {
            if (err)
                console.log("could not insert : " + err);
            else
                console.log('Inserted : ', doc.path, 'with ID', doc._id);
        });
    }

    updateMetadata(path, entry) {
        databases.fileMetaDataDb.findOne({path: path}, function (err, result) {
            if (!err) {
                console.log('File found: ', JSON.stringify(result));
                entry.previous_cs = result.new_cs;
                databases.fileMetaDataDb.update({path: path}, {$set: entry}, {}, function (err, numReplaced) {
                    if (!err)
                        console.log(numReplaced + " entries updated");
                });
            }
        });
    }

    updateMetadataForRenaming(oldpath, newPath, isDirectory) {
        if (isDirectory) {
            let regex = new RegExp(oldpath);
            databases.fileMetaDataDb.find({path: {$regex: regex}}, function (err, docs) {
                for (let i = 0; i < docs.length; i++) {
                    var path = (docs[i].path).replace(regex, newPath);
                    databases.fileMetaDataDb.update({path: docs[i].path}, {$set: {path: path}}, {}, function (err, numReplaced) {
                        if (!err)
                            console.log(numReplaced + " entries updated");
                    });
                }
            });
        }
        else {
            databases.fileMetaDataDb.update({path: oldpath}, {$set: {path: newPath}}, {}, function (err, numReplaced) {
                if (!err)
                    console.log(numReplaced + " entries updated");
            });
        }
    }

    deleteMetadata(path) {
        let regex = "/^" + path + "/"
        databases.fileMetaDataDb.remove({path: path}, function (err, numDeleted) {
            if (err)
                console.log(err);
            console.log('Deleted', numDeleted, 'files');
        });
    }

    findMetadata(path) {
        databases.fileMetaDataDb.findOne({path: path}, function (err, doc) {
            if (err)
                console.log(err);
            console.log('File found: ', doc.path);
        });
    }
}