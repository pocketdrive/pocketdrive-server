/**
 * @author Dulaj Atapattu
 */

import fs from 'fs';
import md5File from 'md5-file';
import {ChunkBasedSynchronizer} from "./chunk-based-synchronizer";
import MetadataDBHandler from "../db/file-metadata-db";
import ChecksumDBHandler from "../db/checksum-db";

import {SyncActions} from './sync-constants';
import {CommonUtils} from "../utils/common";

export function renameFile() {

}

export function deleteFile() {

}

export async function createOrModifyFile(fullPath, remoteCurrentCS, remoteSyncedCs) {
    let reply = {};

    if (!checkExistence(fullPath)) {
        reply.action = SyncActions.justCopy;
    }
    else {
        const current_cs = getCurrentChecksum(fullPath);
        console.log('current_cs: ', current_cs);
        console.log('remoteSyncedCs: ', remoteSyncedCs);

        if (current_cs === remoteCurrentCS) {
            setChecksum(CommonUtils.getNormalizedPath(fullPath), current_cs);
            reply.action = SyncActions.doNothing;
        }
        else if (current_cs === remoteSyncedCs) {
            reply.action = SyncActions.update;
            reply.oldFileChecksums = await ChunkBasedSynchronizer.getChecksumOfChunks(fullPath);
        }
        else {
            reply.action = SyncActions.conflict;
        }
    }

    return reply;
}

export function checkExistence(fullPath) {
    return fs.existsSync(fullPath);
}

export function getCurrentChecksum(fullPath) {
    return md5File.sync(fullPath);
}

export function afterSyncFile(path, syncedChecksum) {
    deleteMetadataEntry(path);

    if (arguments.length === 2) {
        setChecksum(path, syncedChecksum);
    }
}

export function deleteMetadataEntry(path) {
    MetadataDBHandler.deleteEntry(path);
}

export function setChecksum(path, syncedChecksum) {
    ChecksumDBHandler.setChecksum(path, syncedChecksum);
}