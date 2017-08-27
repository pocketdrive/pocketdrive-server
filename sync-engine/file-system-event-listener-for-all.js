fsmonitor = require('fsmonitor');
import fs from 'fs';
import path from 'path';
import * as _ from 'lodash';

const p = console.log;
import MetadataDBHandler from '../db/file-metadata-db';
import * as metaUtils from '../utils/meta-data';
import {error} from "../communicator/peer-messages";

const metaDB = new MetadataDBHandler();
export const Actions = {NEW: 'NEW', MODIFY: 'MODIFY', DELETE: 'DELETE', RENAME: 'RENAME'};

// TODO: Clean and refactor this class @dulaj
/**
 * @author Pamoda Wimalasiri
 */
export default class FileSystemEventListener {

    // constructor(username, folder) {
    //     // TODO create directory by environment
    //     // For each users sync directory start the watcher
    //     this.pdPath = process.env.PD_FOLDER_PATH;
    //     this.username = username;
    //     this.baseDirectory = path.resolve(this.pdPath, username, folder);
    //     p(this.baseDirectory);
    //     this.hashtable = {};
    //     this.data = {};

    //     metaDB.getNextSequenceID().then((result) => {
    //         this.sequenceID = result.data;
    //     })
    // }

    start() {
        var monitor = fsmonitor.watch('/home/pamoda/SyncTest', {
            // include the temparory files
            matches: function(relpath) {
                return relpath.match(/(\/\.)|(\\\.)|^(\.)/) == null;
            },
            excludes: function(relpath) {
                return false;
            }
        });
        
        monitor.on('change', function(changes) {
            console.log("CHANGE DETECTED");
            //dir rename 
            if ((change.addedFolders).length > 0 && (change.addedFolders).length == (change.removedFolders).length){
                //TODO : rename directory DB entry
                let entry = {
                    action : "RENAME",
                    type : "dir",
                    oldPath : change.removedFolders[0],
                    newPath : change.addedFolders[0]
                };
                console.log("DIR RENAME ", change.removedFolders[0], " into " , change.addedFolders[0] );
            }else if ((change.addedFiles).length ==1 && (change.removedFiles).length ==1){
                //TODO : rename file DB entry
                let entry = {
                    action : "RENAME",
                    type : "file",
                    oldPath : change.removedFiles[0],
                    newPath : change.addedFiles[0]
                };
                console.log("FILE RENAME ", change.removedFiles[0], " into " , change.addedFiles[0] );
            } else{
                //dir creation
                if ((change.addedFolders).length > 0){
                    // TODO : for each dir creation make DB entry
                    for (var i= 0 ; i < (change.addedFolders).length ; i++){
                        console.log("DIR CREATED ", change.addedFolders[i]);
                        let entry = {
                            action : "CREATE",
                            type : "dir",
                            path : change.addedFolders[i]
                        };  
                    }
                }
                //file creation
                if ((change.addedFiles).length > 0){
                    for (var i= 0 ; i < (change.addedFiles).length ; i++){
                        // TODO : for each file creation make DB entry
                        console.log("FILE CREATED ", change.addedFiles[i]);
                        let entry = {
                            action : "CREATE",
                            type : "file",
                            path : change.addedFiles[i]
                        }; 
                    }
                }
                //dir deletion
                if ((change.removedFolders).length > 0){
                    //the listener returns all the directories deleted(including the inner dir). this part identifies the outer folders only
                    let regexIdentifyBaseDirectories = new RegExp(change.removedFolders[0]+"(\/|\\|\/\/)" );
                    let baseDirectories = [change.removedFolders[0]];
                    console.log("DIR DELETE ", change.removedFolders[0]);
                    for (var i= 1 ; i < (change.removedFolders).length ; i++){
                        if (change.removedFolders[i].match(regexIdentifyBaseDirectories) == null){
                            console.log("DIR DELETE ", change.removedFolders[i]);
                            // TODO : dir deletion make DB entry
                            let entry = {
                                action : "DELETE",
                                type : "dir",
                                path : change.removedFolders[i]
                            }; 
                            baseDirectories.push(change.removedFolders[i]);
                            regexIdentifyBaseDirectories = new RegExp(change.removedFolders[i]+"(\/|\\|\/\/)");
                        }
                    }
                    //listener returns the files inside the folders. eleminates those files
                    //identifies the files which not in deleted folders (when two or more files and folders are deleted)
                    let stringBaseDirectories = baseDirectories.join("|");
                    let regexBaseDirectories = new RegExp(stringBaseDirectories+"(\/|\\|\/\/)");
                    for (var i= 0 ; i < (change.removedFiles).length ; i++){
                        if (change.removedFiles[i].match(regexBaseDirectories) == null)
                        console.log("FILE DELETE ", change.removedFiles[i]);
                        // TODO : file deletion make DB entry
                        let entry = {
                            action : "DELETE",
                            type : "file",
                            path : change.removedFiles[i]
                        }; 
                    }
                    //handle the separate file deletions (ie: folders are not deleted)
                }else if ((change.removedFiles).length > 0){
                    for (var i= 0 ; i < (change.removedFiles).length ; i++){
                        console.log("FILE DELETE ", change.removedFiles[i]);
                        // TODO : file deletion make DB entry
                        let entry = {
                            action : "DELETE",
                            type : "file",
                            path : change.removedFiles[i]
                        };                         
                    }
                }
                //handle file modifications
                if ((change.modifiedFiles).length > 0){
                    for (var i= 0 ; i < (change.modifiedFiles).length ; i++){
                        console.log("FILE MODIFIED ", change.modifiedFiles[i]);
                        // TODO : file modify make DB entry
                        let entry = {
                            action : "MODIFY",
                            type : "file",
                            path : change.modifiedFiles[i]
                        };                         
                    }
                }
                //handle dir modifications
                if ((change.modifiedFolders).length > 0 ){
                    for (var i= 0 ; i < (change.modifiedFolders).length ; i++){
                        console.log("DIR MODIFIED ", change.modifiedFolders[i]);
                        // TODO : dir modify make DB entry
                        let entry = {
                            action : "MODIFY",
                            type : "dir",
                            path : change.modifiedFolders[i]
                        };                          
                    }   
                }
            }
        });
    }
}

var handler = new FileSystemEventListener();
handler.start();