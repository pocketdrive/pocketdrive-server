import fs from 'fs';
import * as fse from 'fs-extra';
import path from 'path';
import * as _ from 'lodash';
import archiver from 'archiver';
import decompress from 'decompress';


import {dateToString} from '../web-file-explorer-backend/dateformat';
import * as pathResolver from '../web-file-explorer-backend/pathresolver';
import ShareLinkDbHandler from './../db/share-link-db';
import ShareFolder from "../share-folder-backend/share-folder";
import ShareFolderDbHandler from "../db/share-folder-db";
import {error} from "../communicator/peer-messages";

export default class FileExplorer {

    static list(username, folderPath, sharedFolders, recievedFolders) {

        let error = false;
        let errorMessage = null;
        let files = [];
        let rootShareFolderPath = null;
        let isShareFolderExist = false;
        try {
            const fsPath = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(folderPath));
            const stats = fs.statSync(fsPath);
            if (!stats.isDirectory()) {
                error = true;
                errorMessage = Error("Directory " + fsPath + ' does not exist!');
            } else {
                rootShareFolderPath = `${process.env.PD_FOLDER_PATH}` + '/' + `${username}` + '/' + `${process.env.SHARED_FOLDER_NAME}`;
                const fileNames = fs.readdirSync(fsPath);
                let filePath, stat;

                // filtering out hidden content and editor's backup files
                _.remove(fileNames, (fileName) => {
                    filePath = path.join(fsPath, pathResolver.pathGuard(fileName));
                    stat = fs.statSync(filePath);

                    if (filePath === rootShareFolderPath & stat.isDirectory() & fileName === process.env.SHARED_FOLDER_NAME) {
                        isShareFolderExist = true;
                    }
                    return ((stat.isFile() & fileName[fileName.length - 1] === "~") | fileName[0] === '.' | (filePath === rootShareFolderPath & stat.isDirectory() & fileName === process.env.SHARED_FOLDER_NAME));
                });

                if (isShareFolderExist) {
                    fileNames.push(process.env.SHARED_FOLDER_NAME);
                }

                files = _.map(fileNames, (fileName) => {
                    filePath = path.join(fsPath, pathResolver.pathGuard(fileName));
                    stat = fs.statSync(filePath);
                    if (stat.isDirectory() && sharedFolders.success && sharedFolders.data.indexOf(filePath) > -1) {
                        return {
                            name: fileName,
                            // rights: "Not Implemented", // TODO
                            rights: "drwxr-xr-x",
                            shareright: "rw",
                            size: stat.size,
                            issharedFolder: true,
                            isrecievedfolder: false,
                            ismountedfolder:false,
                            sharableFolder: true,
                            sharedFolder: filePath === rootShareFolderPath & stat.isDirectory() & fileName === process.env.SHARED_FOLDER_NAME,
                            date: dateToString(stat.mtime),
                            type: 'dir',
                        }
                    }
                    // console.log(filePath);
                    // console.log(recievedFolders.data);
                    // console.log(recievedFolders.success && recievedFolders.data.includes(filePath));

                    if (filePath.includes(rootShareFolderPath + '/') && recievedFolders.success) {
                        let res = true;
                        let r = false;
                        let mounted = false;

                        _.each(recievedFolders.data, (user) => {

                            if (filePath === user.destpath) {
                                mounted = true;
                            } else if (filePath.includes(user.destpath)) {
                                if (user.permission === 'r') {
                                    r = true;
                                    res = false;
                                } else {
                                    res = false;
                                }
                            }
                        });
                        if(mounted){
                            return {
                                name: fileName,
                                // rights: "Not Implemented", // TODO
                                rights: "drwxr-xr-x",
                                shareright: "r",
                                size: stat.size,
                                issharedFolder: false,
                                isrecievedfolder: true,
                                ismountedfolder:true,
                                sharableFolder: false,
                                sharedFolder: filePath === rootShareFolderPath & stat.isDirectory() & fileName === process.env.SHARED_FOLDER_NAME,
                                date: dateToString(stat.mtime),
                                type: 'dir',
                            }
                        }
                        if (res) {
                            return {
                                name: fileName,
                                // rights: "Not Implemented", // TODO
                                rights: "drwxr-xr-x",
                                shareright: "r",
                                size: stat.size,
                                issharedFolder: false,
                                isrecievedfolder: true,
                                ismountedfolder:false,
                                sharableFolder: false,
                                sharedFolder: filePath === rootShareFolderPath & stat.isDirectory() & fileName === process.env.SHARED_FOLDER_NAME,
                                date: dateToString(stat.mtime),
                                type: 'dir',
                            }
                        }
                        if (r) {
                            return {
                                name: fileName,
                                // rights: "Not Implemented", // TODO
                                rights: "drwxr-xr-x",
                                shareright: "r",
                                size: stat.size,
                                issharedFolder: false,
                                isrecievedfolder: true,
                                ismountedfolder:false,
                                sharableFolder: false,
                                sharedFolder: filePath === rootShareFolderPath & stat.isDirectory() & fileName === process.env.SHARED_FOLDER_NAME,
                                date: dateToString(stat.mtime),
                                type: stat.isDirectory() ? 'dir' : 'file',
                            }
                        } else {
                            return {
                                name: fileName,
                                // rights: "Not Implemented", // TODO
                                rights: "drwxr-xr-x",
                                shareright: "rw",
                                size: stat.size,
                                issharedFolder: false,
                                isrecievedfolder: true,
                                ismountedfolder:false,
                                sharableFolder: false,
                                sharedFolder: filePath === rootShareFolderPath & stat.isDirectory() & fileName === process.env.SHARED_FOLDER_NAME,
                                date: dateToString(stat.mtime),
                                type: stat.isDirectory() ? 'dir' : 'file',
                            }
                        }

                    }
                    return {
                        name: fileName,
                        // rights: "Not Implemented", // TODO
                        rights: "drwxr-xr-x",
                        shareright: 'rw',
                        size: stat.size,
                        issharedFolder: false,
                        isrecievedfolder: false,
                        ismountedfolder:false,
                        sharableFolder: stat.isDirectory() ? true : false,
                        sharedFolder: filePath === rootShareFolderPath & stat.isDirectory() & fileName === process.env.SHARED_FOLDER_NAME,
                        date: dateToString(stat.mtime),
                        type: stat.isDirectory() ? 'dir' : 'file',
                    }


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
            // console.log(files);
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

    static copy(username, recievedFolders, items, targetPath, singleFileNewName) {
        const oldPaths = _.map(items, (item) => {
            return path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(item));
        });

        const newPath = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(targetPath));
        const sharedFolderPath = path.join(process.env.PD_FOLDER_PATH, username,process.env.SHARED_FOLDER_NAME);

        let iscopyable = false;
        let error = false;
        let errorMessage = null;

        if(newPath.includes(sharedFolderPath)){
            _.each(recievedFolders.data,(user)=>{
                if(newPath.includes(user.destpath) && user.permission==='rw'){
                    iscopyable = true;
                    return false;
                }
            });
        }else{
            iscopyable = true;
        }

        if(iscopyable){
            _.each(oldPaths, (oldPath, index) => {
                try {
                    FileExplorer.copyHelper(oldPath, newPath, items[index]);
                } catch (e) {
                    error = true;
                    errorMessage = e;
                    return false;
                }
            });

        }else{
            error = true;
            errorMessage = "You don't have permission to copy to the relevant destination"
        }

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

    static move(username, recievedFolders, items, newPath) {
        const itemPaths = _.map(items, (item) => {
            return path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(item));
        });

        const target = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(newPath));
        const sharedFolderPath = path.join(process.env.PD_FOLDER_PATH, username,process.env.SHARED_FOLDER_NAME);

        let ismovable = false;
        let error = false;
        let errorMessage = null;

        if(target.includes(sharedFolderPath)){
            _.each(recievedFolders.data,(user)=>{
                if(target.includes(user.destpath) && user.permission==='rw'){
                    ismovable = true;
                    return false;
                }
            });
        }else{
            ismovable = true;
        }

        if(ismovable){
            try {
                    fse.moveSync(itemPaths[0], path.join(target, path.basename(itemPaths[0])));
                } catch (e) {
                console.log(e);
                    error = true;
                    errorMessage = e;
                    return false;
                }
        }else{
            error =true;
            errorMessage = "You don't have permission to move to destination";
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

    static createFolder(username, recievedFolders, newPath) {
        const folderPath = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(newPath));
        const sharedFolderPath = path.join(process.env.PD_FOLDER_PATH, username,process.env.SHARED_FOLDER_NAME);

        console.log(newPath);
        let error = false;
        let errorMessage = null;
        let ispossible = false;

        if(folderPath.includes(sharedFolderPath)){
            _.each(recievedFolders.data,(user)=>{
                if(folderPath.includes(user.destpath) && user.permission==='rw'){
                    ispossible = true;
                    return false;
                }
            });
        }else{
            ispossible = true;
        }

        if(ispossible){
            try {
                fse.ensureDirSync(folderPath,0o777);
            } catch (e) {
                error = true;
                errorMessage = e;
            }

        }else{
            error = true;
            errorMessage = "You don't have permission to create folder in the relevant destination"
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


    static shareFolder(shareObj) {

        let response = [];
        let itemcounter = 0;
        let overallsuccess = true;
        return new Promise((resolve) => {
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
                        let finalresult = {
                            "success": overallsuccess,
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