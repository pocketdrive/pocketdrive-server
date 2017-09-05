
import express from 'express';
import mime from 'mime';
import Promise from 'bluebird';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
var routes = express.Router();
import dateformat from '../web-file-explorer-backend/dateformat';
import pathResolver from '../web-file-explorer-backend/pathresolver';

export default class FileExplorer{

    list(path){

        var promise;
        var self = this;
        let folderpath = process.env.PD_FOLDER_PATH + req.username;
        var fsPath = path.join(folderpath, pathResolver.pathGuard(path));

        promise = fs.statAsync(fsPath).then(function (stats) {
            if (!stats.isDirectory()) {
                throw new Error("Directory " + fsPath + ' does not exist!');
            }
        });

        promise = promise.then(function () {
            return fs.readdirAsync(fsPath);
        });

        promise = promise.then(function (fileNames) {

            return Promise.map(fileNames, function (fileName) {

                var filePath = path.join(fsPath, pathResolver.pathGuard(fileName));

                return fs.statAsync(filePath).then(function (stat) {

                    return {
                        name: fileName,
                        // rights: "Not Implemented", // TODO
                        rights: "drwxr-xr-x",
                        size: stat.size,
                        date: dateformat.dateToString(stat.mtime),
                        type: stat.isDirectory() ? 'dir' : 'file',
                    };
                });
            });
        });

        promise = promise.then(function (files) {
            res.status(200);
            res.send({
                "result": files
            });
        });

        promise = promise.catch(function (err) {
            res.status(500);
            res.send({
                "result": {
                    "success": false,
                    "error": err
                }
            });
        });

        return promise;
    }
}