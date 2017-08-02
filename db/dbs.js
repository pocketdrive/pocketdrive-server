import DataStore from 'nedb';

export const userDb = new DataStore({filename: process.env.NE_DB_PATH_USER, autoload: true});
export const accessDb = new DataStore({filename: process.env.NE_DB_PATH_ACCESS, autoload: true});
export const linkShareDb = new DataStore({filename: process.env.NE_DB_PATH_LINK_SHARED_FILES, autoload: true});