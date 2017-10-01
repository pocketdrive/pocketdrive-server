import DataStore from 'nedb';

export const userDb = new DataStore({filename: process.env.NE_DB_PATH_USER, autoload: true});
export const accessDb = new DataStore({filename: process.env.NE_DB_PATH_ACCESS, autoload: true});
export const linkShareDb = new DataStore({filename: process.env.NE_DB_PATH_LINK_SHARED_FILES, autoload: true});
export const fileMetaDataDb = new DataStore({filename: process.env.NE_DB_PATH_FILE_METADATA, autoload: true});
export const syncDb = new DataStore({filename: process.env.NE_DB_PATH_SYNC, autoload: true});
export const checkSumDB = new DataStore({filename: process.env.NE_DB_PATH_CHECKSUM, autoload: true});
export const nisDb = new DataStore({filename: process.env.NE_DB_PATH_NIS, autoload: true});
export const shareDb = new DataStore({filename: process.env.NE_DB_PATH_SHARE_FOLDER, autoload: true});

userDb.ensureIndex({ fieldName: 'username', unique: true });