/**
 * Created by anuradhawick on 8/2/17.
 */
import DataStore from 'nedb';
import uuid from 'uuid/v4';

const linkShare = new DataStore({filename: process.env.NE_DB_PATH_LINK_SHARED_FILES, autoload: true});
const sampleLink = {fileId: '', filePath: '', username: ''};

export default class FileShare {
    constructor() {

    }

    _generateLink() {

    }


}