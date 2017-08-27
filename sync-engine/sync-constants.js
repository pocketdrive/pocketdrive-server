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
    deleteFile: 'deleteEntry'
};

export const SyncActionMessages = {
    chunkBasedSync: 'chunkBasedSync'
};

export const SyncActions = {
    doNothing: 'doNothing',
    justCopy: 'justCopy',
    update: 'update',
    conflict: 'conflict',
    rename: 'rename',
    delete: 'delete'
};