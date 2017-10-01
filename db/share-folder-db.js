import * as databases from './dbs';

/**
 * @author ravidu
 */
export default class ShareFolderDbHandler {

    /**
     * shareObj = {
     *      owner: string
     *      srcpath: string
     *      foldername: string
     *      candidates:[{username:string,permission:string}]
     * }
     * */

    static shareFolder(shareObj, candidate) {
        let result = {success: false}

        return new Promise((resolve) => {

            databases.shareDb.findOne({owner: shareObj.username_from, srcpath: shareObj.path}, (err, doc) => {
                if (err) {
                    this.handleError(result, 'Database error. Share Folder Insertion failed', err);
                    resolve(result);
                } else if (!doc) {
                    databases.shareDb.insert({
                        owner: shareObj.username_from,
                        srcpath: shareObj.path,
                        candidates: [candidate]
                    }, (err, doc) => {
                        if (err) {
                            this.handleError(result, 'Database error. Share Folder Insertion failed', err);
                            resolve(result);
                        } else if (!doc) {
                            result.error = "Database insertion failed";
                            resolve(result);
                        } else {
                            result.success = true;
                            resolve(result);
                        }
                    })
                } else {
                    databases.shareDb.update(doc, {$addToSet: {candidates: candidate}}, {}, (err, doc) => {
                        if (doc) {
                            result.success = true;
                            resolve(result);
                        } else if (err) {
                            result.error = "Database update failed";
                            resolve(result);
                        }
                    });
                }
            })
        })
    }

    static searchCandidateEntry(shareObj, candidate) {
        console.log(candidate);
        let result = {success: false};
        return new Promise((resolve) => {
            databases.shareDb.find({
                owner: shareObj.username_from,
                srcpath: shareObj.path,
                "candidates.username": candidate
            }, (err, doc) => {
                if (err) {
                    result.success = false;
                    this.handleError(result, 'Database error. Share Folder search failed', err);
                    resolve(result);
                } else if (!doc) {
                    result.success = false;
                    result.error = 'search entry cannot be found';
                    resolve(result);
                } else {
                    if (doc.length !== 0) {
                        for (let user of doc[0].candidates) {
                            if (user.username === candidate) {
                                result.success = true;
                                result.user = user;
                                resolve(result);
                                break;
                            }
                        }
                    } else {
                        result.success = false;
                        result.error = "Shared user cannot be found in the database";
                        resolve(result);
                    }


                }
            });
        });

    }

    static eliminateCandidate(shareObj, candidate) {
        let result = {};
        return new Promise((resolve) => {

            databases.shareDb.update({
                owner: shareObj.username_from,
                srcpath: shareObj.path
            }, {$pull: {candidates: candidate}}, {}, (err, doc) => {
                if (err) {
                    result.success = false;
                    this.handleError(result, 'Database error. Eliminate Candidate error', err);
                    resolve(result);
                } else if (doc === 1) {
                    result.success = true;
                    resolve(result);
                }
            });
        });
    }

    static renameSrcFolder(shareObj) {

        let result = {success: false};
        return new Promise((resolve) => {
            databases.shareDb.findOne({owner: shareObj.username_from, srcpath: shareObj.oldpath}, (err, doc) => {
                if (err) {
                    result['success'] = false;
                    this.handleError(result, 'Database error. Error in renaming source folder', err);
                    resolve(result);
                } else if (!doc) {
                    result.success = false;
                    result.error = 'Couldn\'t able to find the entry';
                    resolve(result);
                } else {
                    databases.shareDb.update(doc, {$set: {srcpath: shareObj.newpath}}, {}, (err, numReplaced) => {
                        if (numReplaced === 1) {
                            result.success = true;
                            resolve(result);
                        }
                    });
                }
            })
        });
    }

    handleError(result, msg, err) {
        if (arguments.length === 3) {
            console.error(msg, err);
        } else {
            console.error(msg);
        }
        result.error = msg;
    }
}
