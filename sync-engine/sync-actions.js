/**
 * @author Dulaj Atapattu
 */

import fs from 'fs';
import md5File from 'md5-file';
import * as _ from 'lodash';
import hasher from 'folder-hash';
import hasha from 'hasha';

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
        const current_cs = getFileChecksum(fullPath);

        if (current_cs === remoteCurrentCS) {
            setSyncedChecksum(CommonUtils.getNormalizedPath(fullPath), current_cs);
            reply.action = SyncActions.doNothingFile;
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

export function isFolderEmpty(fullPath) {
    return !fs.readdirSync(fullPath).length;
}

export function afterSyncFile(path, syncedChecksum) {
    deleteMetadataEntry(path);

    if (arguments.length === 2) {
        setSyncedChecksum(path, syncedChecksum);
    }
}

export function deleteMetadataEntry(path) {
    MetadataDBHandler.deleteEntry(path);
}

export function setSyncedChecksum(path, syncedChecksum) {
    ChecksumDBHandler.setChecksum(path, syncedChecksum);
}

export async function getSyncedChecksum(path) {
    let syncedChecksum = '';

    await ChecksumDBHandler.getChecksum(path).then((result) => {
        syncedChecksum = result.data;
    });

    return syncedChecksum;
}

/**
 * Returns a hash for the given file.
 * Hash is equal for 2 files if and only if the content of the 2 files are exactly same.
 * Names of the 2 files don't matter.
 *
 * @param fullPath - Absolute path of the folder
 * @returns MD5 hash of the folder
 */
export function getFileChecksum(fullPath) {
    return md5File.sync(fullPath);
}

/**
 * Returns a hash for the given folder.
 * Hash is equal for 2 folders if and only if the content of the 2 folders are exactly same.
 * Names of the 2 folders don't matter and the names of the files and folders inside the given folder matter.
 *
 * @param fullPath - Absolute path of the folder
 * @returns MD5 hash of the folder
 */
export async function getFolderChecksum(fullPath) {
    let hash = '';

    await hasher.hashElement(fullPath, {algo: 'md5'}).then(function (hashes) {
        _.each(hashes.children, (child) => {
            hash += child.hash;
        })
    });

    return hasha(hash, {algorithm: 'md5'});
}