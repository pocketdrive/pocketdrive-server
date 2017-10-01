import {exec} from 'child_process';

import * as  utils from '../utils/file';
import * as _ from 'lodash';

import UserDbHandler from '../db/user-db';
import ShareFolderDbHandler from "../db/share-folder-db";

const dbh = new UserDbHandler();

export default class ShareFolder {

    static share(shareObject, callback) {

        let username_from = shareObject.username_from;
        let candidates = shareObject.candidates;
        let path = shareObject.path;
        let folder_name = shareObject.folder_name;

        dbh.checkUsernames(candidates).then((result) => {

            if (!result.success) {

                result['success'] = false;
                result['error'] = 'Shared user(s) doesn\'t exist please check usernames';
                callback(result);
            } else {

                let src = path;

                _.each(candidates, (candidate) => {

                    let dest = process.env.PD_FOLDER_PATH + '/' + candidate.username + '/' + process.env.SHARED_FOLDER_NAME + '/' + username_from;

                    if (utils.isDirectoryExists(src) & !utils.isDirectoryExists(dest)) {

                        let rw = (candidate.permission === 'r') ? '-r' : '';
                        let createDirCmd = 'mkdir -p ' + '\"' + `${dest}` + '\"';

                        console.log(createDirCmd);
                        exec(createDirCmd, function (error, stdout, stderr) {
                            if (error) {
                                result['success'] = false;
                                result['error'] = 'Creating shared folder for user failed';
                                console.error('Creating shared folder for user failed');
                                console.error(error);
                                callback(result);

                            } else {
                                dest = dest + '/' + utils.getAvailableName(dest, folder_name);
                                createDirCmd = 'mkdir ' + '\"' + `${dest}` + '\"';

                                console.log(createDirCmd);
                                exec(createDirCmd, function (error, stdout, stderr) {
                                    if (error) {
                                        result['success'] = false;
                                        result['error'] = 'Creating shared folder failed';
                                        console.error('Creating shared folder failed');
                                        console.error(error);
                                        callback(result);
                                    } else {
                                        let mountCmd = 'sudo mount \"' + `${src}` + '\" \"' + `${dest}` + '\" --bind ' + rw;

                                        console.log(mountCmd);
                                        exec(mountCmd, function (error, stdout, stderr) {
                                            if (error) {
                                                result['success'] = false;
                                                result['error'] = 'Mounting shared folder failed';
                                                console.error('Mounting shared folder failed');
                                                console.error(error);
                                                callback(result);
                                            } else {
                                                result['success'] =true;
                                                result['candidate'] = candidate;
                                                callback(result);
                                                // ShareFolderDbHandler.shareFolder(shareObject,candidate).then((result)=>{
                                                //     if(result.success){
                                                //         result['success'] = true;
                                                //         callback(result);
                                                //     }else{
                                                //         callback(result);
                                                //     }
                                                // })

                                            }
                                        });
                                    }
                                });
                            }
                        });
                    } else {
                        result['success'] = false;
                        result['error'] = 'Directory is already shared with ' + `${candidate.username}`;
                        callback(result);
                    }
                });

            }
        });


    }


}