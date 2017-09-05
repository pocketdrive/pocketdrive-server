import fs from 'fs';
import path from 'path';
import * as _ from 'lodash';

import {dateToString} from '../web-file-explorer-backend/dateformat';
import * as pathResolver from '../web-file-explorer-backend/pathresolver';

export default class FileExplorer {

    static list(username, folderPath) {

        try {
            const fsPath = path.join(process.env.PD_FOLDER_PATH, username, pathResolver.pathGuard(folderPath))
            const stats = fs.statSync(fsPath);
            if (!stats.isDirectory()) {
                throw new Error("Directory " + fsPath + ' does not exist!');
            }

            const fileNames = fs.readdirSync(fsPath);
            let filePath, stat;

            const files = _.map(fileNames, (fileName) => {
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

            return {
                "result": files
            };
        } catch (e) {
            return {
                "result": {
                    "success": false,
                    "error": e
                }
            };
        }
    }
}