/**
 * @author Dulaj Atapattu
 */

export const SyncEvents = {
    NEW: 'NEW',
    MODIFY: 'MODIFY',
    DELETE: 'DELETE',
    RENAME: 'RENAME'
};

export const SyncMessages = {
    newFile: 'newFile',
    modifyFile: 'modifyFile',
    renameFile: 'renameFile',
    deleteFile: 'deleteEntry',
    newFolder: 'newFolder',
    renameFolder: 'renameFolder',
    deleteFolder: 'deleteFolder'
};

export const SyncActionMessages = {
    chunkBasedSync: 'chunkBasedSync',
    newFolder: 'newFolder',
    serverToPdSync: 'serverToPdSync'
};

export const SyncActions = {
    doNothingFile: 'doNothingFile',
    doNothingDir: 'doNothingDir',
    justCopy: 'justCopy',
    update: 'update',
    conflict: 'conflict',
    rename: 'rename',
    delete: 'delete',
    streamFolder: 'streamFolder'
};