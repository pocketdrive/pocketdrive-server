import fs from 'fs';
import * as fse from 'fs-extra';
import path from 'path';
import * as _ from 'lodash';
import archiver from 'archiver';
import decompress from 'decompress';
import * as async from 'async';

import UserDbHandler from '../db/user-db';
import {dateToString} from '../web-file-explorer-backend/dateformat';
import * as pathResolver from '../web-file-explorer-backend/pathresolver';
import ShareLinkDbHandler from './../db/share-link-db';
import ShareFolder from "../share-folder-backend/share-folder";
import {error} from "../communicator/peer-messages";
import ShareFolderDbHandler from "../db/share-folder-db";

const dbh = new UserDbHandler();

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
                            ismountedfolder: false,
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
                        if (mounted) {
                            return {
                                name: fileName,
                                // rights: "Not Implemented", // TODO
                                rights: "drwxr-xr-x",
                                shareright: "r",
                                size: stat.size,
                                issharedFolder: false,
                                isrecievedfolder: true,
                                ismountedfolder: true,
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
                                ismountedfolder: false,
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
                                ismountedfolder: false,
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
                                ismountedfolder: false,
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
                        ismountedfolder: false,
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
        const sharedFolderPath = path.join(process.env.PD_FOLDER_PATH, username, process.env.SHARED_FOLDER_NAME);

        let iscopyable = false;
        let error = false;
        let errorMessage = null;

        if (newPath.includes(sharedFolderPath)) {
            _.each(recievedFolders.data, (user) => {
                if (newPath.includes(user.destpath) && user.permission === 'rw') {
                    iscopyable = true;
                    return false;
                }
            });
        } else {
            iscopyable = true;
        }

        if (iscopyable) {
            _.each(oldPaths, (oldPath, index) => {
                try {
                    FileExplorer.copyHelper(oldPath, newPath, items[index]);
                } catch (e) {
                    error = true;
                    errorMessage = e;
                    return false;
                }
            });

        } else {
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
        const sharedFolderPath = path.join(process.env.PD_FOLDER_PATH, username, process.env.SHARED_FOLDER_NAME);

        let ismovable = false;
        let error = false;
        let errorMessage = null;

        if (target.includes(sharedFolderPath)) {
            _.each(recievedFolders.data, (user) => {
                if (target.includes(user.destpath) && user.permission === 'rw') {
                    ismovable = true;
                    return false;
                }
            });
        } else {
            ismovable = true;
        }

        if (ismovable) {
            try {
                fse.moveSync(itemPaths[0], path.join(target, path.basename(itemPaths[0])));
            } catch (e) {
                console.log(e);
                error = true;
                errorMessage = e;
                return false;
            }
        } else {
            error = true;
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
        const sharedFolderPath = path.join(process.env.PD_FOLDER_PATH, username, process.env.SHARED_FOLDER_NAME);

        console.log(newPath);
        let error = false;
        let errorMessage = null;
        let ispossible = false;

        if (folderPath.includes(sharedFolderPath)) {
            _.each(recievedFolders.data, (user) => {
                if (folderPath.includes(user.destpath) && user.permission === 'rw') {
                    ispossible = true;
                    return false;
                }
            });
        } else {
            ispossible = true;
        }

        if (ispossible) {
            try {
                fse.ensureDirSync(folderPath, 0o777);
            } catch (e) {
                error = true;
                errorMessage = e;
            }

        } else {
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


    static shareFolderChooser(username, folderpath, users, candidates, removedCandidates) {

        const newpath = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(folderpath));
        let arr =folderpath.split('/');
        let foldername = arr[arr.length-1];
        let finalresult = [];

        return new Promise((resolve)=>{
            if (users && users.length > 0) {
                console.log("Inside users")
                let shareObj = {
                    username_from: username,
                    candidates: users,
                    path: newpath,
                    folder_name:foldername
                }
                this.shareFolder(shareObj).then((result)=>{
                    if(!candidates && removedCandidates.length===0){
                        resolve({
                            "result": {
                                "success": true,
                                "msg": result
                            }
                        });
                    }else{
                        finalresult.push(result);
                    }
                });
            }

            console.log(!candidates);
            console.log(removedCandidates);
            if(candidates && candidates.length>0){
                console.log("Inside this");
                let shareObj ={
                	username_from:username,
                	candidates:candidates,
                	path:newpath,
                	folder_name:foldername
                   }
                this.changeSharedFolderPermission(shareObj).then((result)=>{
                    // console.log(result);
                    if(removedCandidates.length===0){
                        finalresult.push(result);
                        resolve({
                            "result": {
                                "success": true,
                                "msg": finalresult
                            }
                        });
                    }else{
                        finalresult.push(result);
                    }
                });
                console.log("After users");
            }

            if(removedCandidates && removedCandidates.length>0){
                console.log("Inside this");
                let namearr = [];
                for(let user of removedCandidates){
                    namearr.push(user.username);
                }
                let shareObj ={
            	    username_from:username,
            	    candidates:namearr,
            	    path:newpath,
            	    folder_name:foldername
                    }
                    this.removeShareFolder(shareObj).then((result)=>{
                        finalresult.push(result);
                        resolve({
                            "result": {
                                "success": true,
                                "msg": finalresult
                            }
                        });

                    });
            }
            console.log("finalresult");
        });




    }

    static removeShareFolder(shareObj){
        let response = [];
        let itemcounter = 0;
        let overallsuccess = true;

        return new Promise((resolve)=>{
            async.each(shareObj.candidates, (candidate) => {
                ShareFolder.unshare(shareObj, candidate, (result) => {
                    itemcounter++;
                    if (!result.success) {
                        let msg ={};
                        overallsuccess = false;
                        msg.username = candidate;
                        msg.error = result.error;
                        response.push(msg);
                    }
                    if (itemcounter === shareObj.candidates.length) {
                        let finalresult={
                            "success": overallsuccess,
                            "msg": response
                        }
                        resolve(finalresult);
                    }
                });
            });
        });

    }
    static changeSharedFolderPermission(shareObj){
        let response = [];
        let itemcounter = 0;
        let overallsuccess = true;

        return new Promise((resolve)=>{
            async.each(shareObj.candidates, (candidate) => {
                ShareFolder.changePermission(shareObj, candidate, (result) => {
                    itemcounter++;

                    if (!result.success) {
                        let msg ={};
                        overallsuccess = false;
                        msg.username = candidate.username;
                        msg.error = result.error;
                        response.push(msg);
                    }
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

    static getUsers(username) {

        return new Promise((resolve) => {
            dbh.getAllUsers().then((result) => {
                if (result.success) {
                    let users = [];
                    _.each(result.data, (user) => {
                        if (user.username !== username) {
                            let candidate = {
                                username: user.username,
                                name: `${user.firstname}` + ' ' + `${user.lastname}`,
                                fullname: `${user.firstname}` + ' ' + `${user.lastname}` + ' (' + `${user.username}` + ')'
                            };
                            users.push(candidate);
                        }
                    });
                    if (users.length === 0) {
                        resolve({
                            "result": {
                                "success": false,
                                "error": "No user to share"
                            }
                        });
                    } else {
                        resolve({
                            "result": {
                                "success": true,
                                "users": users
                            }
                        });
                    }

                } else {
                    resolve({
                        "result": {
                            "success": false,
                            "error": "Cannot find users"
                        }
                    });
                }
            });
        });

    }

    static getCandidates(username, srcpath) {

        const destination = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(srcpath));
        return new Promise((resolve) => {
            ShareFolderDbHandler.searchCandidates(username, destination).then((result) => {
                resolve(result);
            });
        });
    }

    static copyHelper(source, target, name) {
        const file = fs.readFileSync(source);
        fs.writeSync(fs.openSync(path.join(target, path.basename(name)), 'w'), file);
    }
}