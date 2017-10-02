import fs from 'fs';
import * as fse from 'fs-extra';
import path from 'path';
import * as _ from 'lodash';
import archiver from 'archiver';
import decompress from 'decompress';
import * as async from 'async';


import {dateToString} from '../web-file-explorer-backend/dateformat';
import * as pathResolver from '../web-file-explorer-backend/pathresolver';
import ShareLinkDbHandler from './../db/share-link-db';
import ShareFolder from "../share-folder-backend/share-folder";


export default class FileExplorer {

    static list(username, folderPath) {
        let error = false;
        let errorMessage = null;
        let files = [];
        try {
            const fsPath = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(folderPath));
            const stats = fs.statSync(fsPath);
            if (!stats.isDirectory()) {
                error = true;
                errorMessage = Error("Directory " + fsPath + ' does not exist!');
            } else {
                const fileNames = fs.readdirSync(fsPath);
                let filePath, stat;
                // filtering out hidden content
                _.remove(fileNames, (fileName) => {
                    return fileName[0] === '.';
                });

                files = _.map(fileNames, (fileName) => {
                    filePath = path.join(fsPath, pathResolver.pathGuard(fileName));
                    stat = fs.statSync(filePath);
                    return {
                        name: fileName,
                        // rights: "Not Implemented", // TODO
                        rights: "drwxr-xr-x",
                        size: stat.size,
                        date: dateToString(stat.mtime),
                        type: stat.isDirectory() ? 'dir' : 'file',
                    };
                });
            }

        } catch (e) {
            error = true;
            errorMessage = e;
        }

        if (error) {
            return {
                "result": {
                    "success": false,
                    "error": errorMessage
                }
            };
        } else {
            return {
                "result": files
            };
        }
    }

    static remove(username, items) {
        const filePaths = _.map(items, (filePath) => {
            return path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(filePath));
        });

        let error = false;
        let errorMessage = null;

        _.each(filePaths, (path) => {
            try {
                if (fs.statSync(path).isDirectory()) {
                    fse.removeSync(path);
                } else {
                    fs.unlinkSync(path);
                }
            } catch (e) {
                error = true;
                errorMessage = e;
            }
        });

        if (error) {
            return {
                "result": {
                    "success": true,
                    "error": errorMessage
                }
            }
        } else {
            return {
                "result": {
                    "success": false,
                    "error": null
                }
            };
        }
    }

    static rename(username, itemName, itemNameNew) {
        const oldPath = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(itemName));
        const newPath = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(itemNameNew));

        let error = false;
        let errorMessage = null;

        try {
            fs.renameSync(oldPath, newPath);
        } catch (e) {
            error = true;
            errorMessage = e;
        }

        if (error) {
            return {
                "result": {
                    "success": true,
                    "error": errorMessage
                }
            }
        } else {
            return {
                "result": {
                    "success": true,
                    "error": null
                }
            };
        }
    }

    static copy(username, items, targetPath, singleFileNewName) {
        const oldPaths = _.map(items, (item) => {
            return path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(item));
        });
        const newPath = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(targetPath));

        let error = false;
        let errorMessage = null;

        _.each(oldPaths, (oldPath, index) => {
            try {
                FileExplorer.copyHelper(oldPath, newPath, items[index]);
            } catch (e) {
                error = true;
                errorMessage = e;
                return false;
            }
        });

        if (!error && !_.isEmpty(singleFileNewName) && singleFileNewName.length > 0) {
            FileExplorer.rename(username,
                path.join(targetPath, path.basename(items[0])),
                path.join(targetPath, singleFileNewName)
            );
        }

        if (error) {
            return {
                "result": {
                    "success": false,
                    "error": errorMessage
                }
            };
        } else {
            return {
                "result": {
                    "success": true,
                    "error": null
                }
            };
        }
    }

    static move(username, items, newPath) {
        const itemPaths = _.map(items, (item) => {
            return path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(item));
        });
        const target = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(newPath));

        let error = false;
        let errorMessage = null;

        _.each(itemPaths, (item) => {
            try {
                fs.renameSync(item, path.join(target, path.basename(item)));
            } catch (e) {
                error = true;
                errorMessage = e;
                return false;
            }
        });

        if (error) {
            return {
                "result": {
                    "success": false,
                    "error": errorMessage
                }
            };
        } else {
            return {
                "result": {
                    "success": true,
                    "error": null
                }
            };
        }
    }

    static createFolder(username, newPath) {
        const folderPath = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(newPath));

        let error = false;
        let errorMessage = null;

        try {
            fs.mkdirSync(folderPath);
        } catch (e) {
            error = true;
            errorMessage = e;
        }

        if (error) {
            return {
                "result": {
                    "success": false,
                    "error": errorMessage
                }
            };
        } else {
            return {
                "result": {
                    "success": true,
                    "error": null
                }
            };
        }
    }

    static compress(username, items, targetPath, targetName) {
        const itemPaths = _.map(items, (item) => {
            return path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(item));
        });

        let targetPathName = path.join(process.env.PD_FOLDER_PATH, username, targetPath, pathResolver.pathGuard(targetName));
        let writeSteamName = targetPathName;
        let error = false;
        let errorMessage = null;

        if (_.isEmpty(path.basename(targetPathName).match(/[.]zip$/))) {
            writeSteamName = `${targetPathName}.zip`;
        }

        try {
            const output = fs.createWriteStream(writeSteamName);
            const archive = archiver('zip', {
                zlib: {level: 1} // Set for best speed compression for better UX
            });

            archive.pipe(output);

            _.each(itemPaths, (itemPath) => {
                if (fs.statSync(itemPath).isDirectory()) {
                    archive.directory(itemPath, path.basename(targetPathName));
                } else {
                    archive.file(itemPath, {name: path.basename(itemPath)});
                }
            });

            archive.finalize();
        } catch (e) {
            error = true;
            errorMessage = e;
        }

        if (error) {
            return {
                "result": {
                    "success": false,
                    "error": errorMessage
                }
            };
        } else {
            return {
                "result": {
                    "success": true,
                    "error": null
                }
            };
        }
    }

    static extract(username, item, destination, folderName) {
        const zipPath = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(item));
        const destinationPath = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(destination));

        let error = false;
        let errorMessage = null;

        try {
            decompress(zipPath, path.join(destinationPath, folderName))
        } catch (e) {
            error = true;
            errorMessage = e;
        }

        return new Promise((resolve) => {
            if (error) {
                resolve({
                    "result": {
                        "success": false,
                        "error": errorMessage
                    }
                });
            } else {
                resolve({
                    "result": {
                        "success": true,
                        "error": null
                    }
                });
            }
        });
    }

    static linkShare(username, item) {
        const dbh = new ShareLinkDbHandler(username, item);

        return new Promise((resolve) => {
            dbh.shareFile().then((fileId) => {
                resolve({
                    "result": {
                        "success": true,
                        "error": null,
                        "id": fileId
                    }
                });
            });
        });
    }


    static shareFolder(shareObj){

        let response = [];
        let itemcounter = 0;
        let overallsuccess = true;
        return new Promise((resolve)=>{
            async.each(shareObj.candidates, (candidate) => {
                ShareFolder.share(shareObj, candidate, (result) => {
                    itemcounter++;
                    let msg = {};
                    msg.username = candidate.username;
                    msg.success = result.success;
                    if (!result.success) {
                        overallsuccess = false;
                        msg.error = result.error;
                    }
                    response.push(msg);
                    if (itemcounter === shareObj.candidates.length) {
                        let finalresult={
                                "overallsuccess": overallsuccess,
                                "msg": response
                            }
                        resolve(finalresult);

                    }
                });
            });
        });


    }
    static copyHelper(source, target, name) {
        const file = fs.readFileSync(source);
        fs.writeSync(fs.openSync(path.join(target, path.basename(name)), 'w'), file);
    }
}