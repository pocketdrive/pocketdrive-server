import {exec} from 'child_process';
const sudo =  require('sudo');

import * as  utils from '../utils/file';
import nodePath from 'path';

import UserDbHandler from '../db/user-db';
import ShareFolderDbHandler from "../db/share-folder-db";

const options = {
    cachePassword: true,
    prompt: 'Enter root password: ',
    spawnOptions: {/* other options for spawn */}
};

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
                let dest = nodePath.join(process.env.PD_FOLDER_PATH, candidate.username, process.env.SHARED_FOLDER_NAME, username_from);
                console.log(dest);
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
                                            console.log('<<<<<<<<<<<< command', 'mount', src, dest, '--bind');

                                            const child = sudo(['mount', src, dest, '--bind', '-v'], options);

                                            child.stdout.on('data', (data) => {
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
                                            });

                                            child.stderr.on('data', (error) => {
                                                error = error.toString();
                                                result['success'] = false;
                                                result['error'] = 'Mounting shared folder failed';
                                                console.error('Mounting shared folder failed');
                                                console.error(error.toString());
                                                callback(result);
                                            });

                                        } else {
                                            const child = sudo(['mount', src, dest, '-o', 'bind', '-v'], options);

                                            child.stdout.on('data', (data) => {
                                                console.log("dest: ", dest);
                                                const child = sudo(['mount', '-o', 'remount,ro','--bind', '-v', dest], options);

                                                child.stdout.on('data', (data) => {
                                                    candidate.destpath = dest;
                                                    ShareFolderDbHandler.shareFolder(shareObject, candidate).then((result) => {
                                                        if (result.success) {
                                                            result['success'] = true;
                                                            callback(result);
                                                        } else {
                                                            callback(result);
                                                        }
                                                    });
                                                });

                                                child.stderr.on('data', (error) => {
                                                    error = error.toString();
                                                    result['success'] = false;
                                                    result['error'] = 'Mounting shared folder failed';
                                                    console.error('Mounting shared folder failed');
                                                    console.error(error);
                                                    callback(result);
                                                });

                                            });

                                            child.stderr.on('data', (error) => {
                                                error = error.toString();
                                                result['success'] = false;
                                                result['error'] = 'Mounting shared folder failed';
                                                console.error('Mounting shared folder failed');
                                                console.error(error);
                                                callback(result);
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

                        const child = sudo(['umount', destpath, '-v'], options);

                        child.stdout.on('data', function (data) {
                            const child = sudo(['rm', '-rf', destpath, '-v'], options);

                            child.stdout.on('data', function (data) {
                                console.log("eliminating candidate");

                                ShareFolderDbHandler.eliminateCandidate(shareObj, user).then((result) => {
                                    console.log(result);
                                    if (!result.success) {
                                        result['success'] = false;
                                        result['error'] = "Error in eliminating user";
                                        callback(result);
                                    } else {
                                        result['success'] = true;
                                        callback(result);
                                    }

                                });
                            });

                            child.stderr.on('data', function (error) {
                                error = error.toString();
                                result['success'] = error;
                                result['error'] = 'Error in deleting shared file';
                                callback(result);
                            });

                        });

                        child.stderr.on('data', function (error) {
                            error = error.toString();
                            result['success'] = false;
                            result['error'] = 'Error in unmounting the shared folder';
                            callback(result);
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

                    const child = sudo(['umount', dest, '-v'], options);

                    child.stdout.on('data', function (data) {
                        if (candidate.permission === 'r') {
                            const child = sudo(['mount', src, dest, '-o', 'bind', '-v'], options);

                            child.stdout.on('data', function (data) {
                                const child = sudo(['mount', dest, '-o', 'remount,ro,bind', '-v'], options);

                                child.stdout.on('data', function (data) {
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
                                });

                                child.stderr.on('data', function (error) {
                                    error = error.toString();
                                    result['success'] = false;
                                    result['error'] = 'Error in remounting shared file in read mode';
                                    console.log(error);
                                    callback(result);
                                });

                            });

                            child.stderr.on('data', function (error) {
                                error = error.toString();
                                result['success'] = false;
                                result['error'] = 'Error in mounting shared file in read mode';
                                console.log(error);
                                callback(result);
                            });

                        } else {
                            const child = sudo(['mount', src, dest, '--bind', '-v'], options);

                            child.stdout.on('data', function (data) {
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
                            });

                            child.stderr.on('data', function (error) {
                                error = error.toString();
                                result['success'] = false;
                                result['error'] = 'Error in deleting shared file';
                                callback(result);
                            });

                        }
                    });

                    child.stderr.on('data', function (error) {
                        error = error.toString();
                        result['success'] = error;
                        result['error'] = 'Error in unmounting shared file';
                        console.log(error);
                        callback(result);
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