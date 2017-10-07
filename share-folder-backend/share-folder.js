import {exec} from 'child_process';

import * as  utils from '../utils/file';

import UserDbHandler from '../db/user-db';
import ShareFolderDbHandler from "../db/share-folder-db";

const dbh = new UserDbHandler();

export default class ShareFolder {

    static share(shareObject, candidate, callback) {

        let username_from = shareObject.username_from;
        let path = shareObject.path;
        let folder_name = shareObject.folder_name;

        let userObj = {username: candidate.username};
        dbh.searchUser(userObj).then((result) => {

            if (!result.success) {
                result['success'] = false;
                result['error'] = 'Shared user doesn\'t exist';
                callback(result);
            } else {
                delete result.data;
                let src = path;
                let dest = process.env.PD_FOLDER_PATH + '/' + candidate.username + '/' + process.env.SHARED_FOLDER_NAME + '/' + username_from;

                if (utils.isDirectoryExists(src)) {

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
                            dest = dest + '/' + folder_name;
                            console.log(dest);
                            if (!utils.isDirectoryExists(dest)) {

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

                                        if (candidate.permission === "rw") {
                                            let mountCmd = 'sudo mount \"' + `${src}` + '\" \"' + `${dest}` + '\" --bind';

                                            console.log(mountCmd);
                                            exec(mountCmd, function (error, stdout, stderr) {
                                                if (error) {
                                                    result['success'] = false;
                                                    result['error'] = 'Mounting shared folder failed';
                                                    console.error('Mounting shared folder failed');
                                                    console.error(error);
                                                    callback(result);
                                                } else {
                                                    console.log("Trying to enter into the database");
                                                    candidate.destpath = dest;
                                                    ShareFolderDbHandler.shareFolder(shareObject, candidate).then((result) => {
                                                        if (result.success) {
                                                            result['success'] = true;
                                                            callback(result);
                                                            console.log("successful database entry");
                                                        } else {
                                                            console.log("Error in inserting into database");
                                                            callback(result);
                                                        }
                                                    })

                                                }
                                            });
                                        } else {
                                            let mountcmd = 'sudo mount \"' + `${src}` + '\" \"' + `${dest}` + '\" -o bind';

                                            exec(mountcmd, function (error, stdout, stderr) {
                                                if (error) {
                                                    result['success'] = false;
                                                    result['error'] = 'Mounting shared folder failed';
                                                    console.error('Mounting shared folder failed');
                                                    console.error(error);
                                                    callback(result);
                                                } else {
                                                    let remountcmd = 'sudo mount \"' + `${dest}` + '\" -o remount,ro,bind';
                                                    exec(remountcmd, function (error, stdout, stderr) {
                                                        if (error) {
                                                            result['success'] = false;
                                                            result['error'] = 'Mounting shared folder failed';
                                                            console.error('Mounting shared folder failed');
                                                            console.error(error);
                                                            callback(result);
                                                        } else {
                                                            candidate.destpath = dest;
                                                            ShareFolderDbHandler.shareFolder(shareObject, candidate).then((result) => {
                                                                if (result.success) {
                                                                    result['success'] = true;
                                                                    callback(result);
                                                                } else {
                                                                    callback(result);
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }

                                    }
                                });
                            } else {
                                result['success'] = false;
                                result['error'] = 'Directory is already shared with ' + `${candidate.username}`;
                                callback(result);
                            }

                        }
                    });
                } else {
                    result['success'] = false;
                    result['error'] = 'Source Directory does not exist';
                    callback(result);
                }


            }
        });


    }


    static unshare(shareObj, candidate, callback) {

        let userObj = {username: candidate};
        dbh.searchUser(userObj).then((result) => {
            if (!result.success) {
                result['success'] = false;
                result['error'] = 'Shared user doesn\'t exist';
                callback(result);
            } else {
                ShareFolderDbHandler.searchCandidateEntry(shareObj, candidate).then((result) => {
                    if (!result.success) {
                        result['success'] = false;
                        result['error'] = 'This folder is not being shared with this user';
                        callback(result);
                    } else {
                        let user = result.user;
                        let destpath = result.user.destpath;

                        let umountcmd = 'sudo umount ' + `${destpath}`;
                        console.log(umountcmd);
                        exec(umountcmd, (error, stdout, stderror) => {
                            if (error) {
                                result['success'] = false;
                                result['error'] = 'Error in unmounting the shared folder';
                                callback(result);
                            } else {

                                let deletecmd = 'sudo rm -rf ' + `${destpath}`;
                                console.log(deletecmd);

                                exec(deletecmd, (error, stdout, stderror) => {
                                    if (error) {
                                        result['success'] = error;
                                        result['error'] = 'Error in deleting shared file';
                                        callback(result);
                                    } else {
                                        console.log("eliminating candidate");
                                        console.log(user);
                                        ShareFolderDbHandler.eliminateCandidate(shareObj, user).then((result) => {
                                            console.log(result);
                                            if (!result.success) {
                                                result['success'] = false;
                                                result['error'] = "Error in eliminating user"
                                                callback(result);
                                            } else {
                                                result['success'] = true;
                                                callback(result);
                                            }

                                        });
                                    }
                                });
                            }
                        });
                    }

                });
            }

        });
    }

    static changePermission(shareObj, candidate, callback) {

        let src = shareObj.path;

        ShareFolderDbHandler.searchCandidateEntry(shareObj, candidate.username).then((result) => {
            if (!result.success) {
                result['success'] = false;
                result['error'] = 'This folder is not being shared with this user';
                callback(result);
            } else {
                let user = result.user;
                let dest = result.user.destpath;

                if (candidate.permission !== user.permission) {

                    let umountcmd = 'sudo umount ' + `${dest}`;

                    console.log(umountcmd);
                    exec(umountcmd, (error, stdout, stderror) => {
                        if (error) {
                            result['success'] = error;
                            result['error'] = 'Error in unmounting shared file';
                            console.log(error);
                            callback(result);
                        } else {

                            if (candidate.permission === 'r') {
                                let rmountcmd = 'sudo mount \"' + `${src}` + '\" \"' + `${dest}` + '\" -o bind';
                                console.log(rmountcmd);
                                exec(rmountcmd, (error, stdout, stderror) => {
                                    if (error) {
                                        result['success'] = false;
                                        result['error'] = 'Error in mounting shared file in read mode';
                                        console.log(error);
                                        callback(result);
                                    } else {
                                        let rremountcmd = 'sudo mount \"' + `${dest}` + '\" -o remount,ro,bind';
                                        exec(rremountcmd, (error, stdout, stderror) => {
                                            if (error) {
                                                result['success'] = false;
                                                result['error'] = 'Error in remounting shared file in read mode';
                                                console.log(error);
                                                callback(result);
                                            } else {
                                                ShareFolderDbHandler.eliminateCandidate(shareObj, user).then((result) => {
                                                    if (!result.success) {
                                                        callback(result)
                                                    } else {
                                                        user.permission = "r";
                                                        ShareFolderDbHandler.shareFolder(shareObj, user).then((result) => {
                                                            if (!result.success) {
                                                                callback(result);
                                                            } else {
                                                                result['success'] = true;
                                                                callback(result);
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });

                                    }
                                });
                            } else {
                                let rwmountcmd = 'sudo mount \"' + `${src}` + '\" \"' + `${dest}` + '\" --bind';
                                exec(rwmountcmd, (error, stdout, stderror) => {
                                    if (error) {
                                        result['success'] = false;
                                        result['error'] = 'Error in deleting shared file';
                                        callback(result);
                                    } else {
                                        ShareFolderDbHandler.eliminateCandidate(shareObj, user).then((result) => {
                                            if (!result.success) {
                                                callback(result)
                                            } else {
                                                user.permission = "rw";
                                                ShareFolderDbHandler.shareFolder(shareObj, user).then((result) => {
                                                    if (!result.success) {
                                                        callback(result);
                                                    } else {
                                                        result['success'] = true;
                                                        callback(result);
                                                    }
                                                });
                                            }
                                        });

                                    }
                                });
                            }

                        }
                    });

                } else {
                    result['success'] = false;
                    result['error'] = "No change in the permission";
                    callback(result);
                }

            }

        });

    }

}