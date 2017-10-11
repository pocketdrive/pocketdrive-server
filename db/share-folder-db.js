import * as databases from './dbs';
import * as _ from 'lodash';

/**
 * @author Ravidu Lashan
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

    static searchOwner(username) {

        let result = {success: false};
        return new Promise((resolve) => {

            databases.shareDb.find({owner: username}, {srcpath: 1, candidates:1,_id: 0}, (err, doc) => {
                if (err) {
                    result.success = false;
                    this.handleError(result, 'Database error. Cant\'t find whether share folder', err);
                    resolve(result);
                } else if (doc && doc.length > 0) {
                    result.success = true;
                    let srcpaths = [];
                    let counter = 0;
                    _.each(doc, (candidate) => {
                        ++counter;
                        if(candidate.candidates.length>0){
                            srcpaths.push(candidate.srcpath);
                        }
                        if (doc.length === counter) {
                            result.data = srcpaths;
                            resolve(result);
                        }
                    });
                } else {
                    resolve(result);
                }
            });
        });
    }

    static searchRecievedFiles(username) {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.shareDb.find({"candidates.username": username}, {candidates: 1, _id: 0}, (err, doc) => {
                if (err) {

                    result.success = false;
                    this.handleError(result, 'Database error. Cant\'t find whether share folder', err);
                    resolve(result);
                } else if (doc && doc.length > 0) {
                    let details = [];
                    result.success = true;
                    _.each(doc, (candidates) => {
                        _.each(candidates, (candidate) => {
                            _.each(candidate, (user) => {
                                if (user.username === username) {
                                    details.push({
                                        permission: user.permission,
                                        destpath: user.destpath
                                    });
                                }
                                if (doc.length === details.length) {
                                    result.data = details;
                                    resolve(result);
                                }
                            });
                        });
                    });

                } else {
                    resolve(result);
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

    static searchCandidates(username, path) {
        let result = {success: false};
        return new Promise((resolve) => {
            databases.shareDb.find({owner: username, srcpath: path}, {candidates: 1, _id: 0}, (err, doc) => {
                if (err) {
                    this.handleError(result, 'Database error. Cant\'t find whether share folder', err);
                    resolve(result);
                } else if (doc && doc.length > 0) {
                    result.success = true;
                    result.candidates=doc[0].candidates;
                    resolve(result);
                } else {
                    resolve(result);
                }
            });
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
