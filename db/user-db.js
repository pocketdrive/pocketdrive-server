/**
 * Created by anuradhawick on 6/10/17.
 */

import * as databases from './dbs';
import * as jwt from 'jsonwebtoken';

export class UserDbHandler {

    /**
     * JSON {
     *      username: string
     *      password: string
     * }
     * */
    addUser(userObj) {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.userDb.findOne({username: userObj.username}, (err, doc) => {
                if (err) {
                    this.handleError(result, 'Database error. Find user failed', err);
                    resolve(result);
                } else if (doc !== null) {
                    delete doc.password;
                    this.handleError(result, 'Username already exists', null);
                    resolve(result);
                } else {
                    databases.userDb.insert(userObj, (err, doc) => {
                        if (err) {
                            this.handleError(result, 'Database error. Adding new user failed', err);
                            resolve(result);
                        } else {
                            let token = jwt.sign(doc, process.env.JWT_SECRET);

                            databases.userDb.update({username: doc.username}, { $set: { token: token }}, {}, (err, numReplaced) => {
                                if (err) {
                                    this.handleError(result, 'Saving token failed', err);
                                    databases.userDb.remove({username: doc.username}, {}, (err, numRemoved) => {
                                        resolve(result);
                                    })
                                } else {
                                    result.success = true;
                                    resolve(result);
                                }
                            })
                        }
                    });
                }


            });
        });

    }

    searchUser(searchObj) {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.userDb.findOne(searchObj, (err, doc) => {
                if (err) {
                    this.handleError(result, 'Database error. Search user failed', err);
                } else if (!doc) {
                    result.success = false;
                    result.error = 'Incorrect username or password';
                } else {
                    result.success = true;
                    result.data = {
                        user: doc
                    };
                    delete result.data.user.password;
                }
                resolve(result);
            });
        });
    }

    /**
     * Remove user given the username
     * */
    removeUser(username) {
        databases.userDb.remove({username: username}, {}, function (err, numRemoved) {
            if (err) {
                console.error('DB ERROR', err);
            }
            if (numRemoved === 0) {
                console.info(`user ${username} not found`);
            }
        });
    }

    /**
     * JSON {
     *      username: string
     *      password: string
     * }
     * */
    updateUser(userObj) {
        databases.userDb.update({username: userObj.username}, {password: userObj.password}, function (err, numReplaced) {
            if (err) {
                console.error('DB ERROR', err);
            }
            if (numReplaced === 0) {
                console.info(`Could not find any matching document for username ${userObj.username}`);
            }
        })
    }

    /**
     * JSON {
     *      owner: owner of the folder
     *      candidate: with whom the content is shared
     *      src_path: file path of the source
     *      dest_path: file path of the destination
     *      permission: access level (r, w)
     * }
     * */
    shareFolder(shareObj) {
        accessDb.insert(shareObj, function (err, newDoc) {
            if (err) {
                console.error('DB ERROR', err);
            }
        });
    }

    /**
     * Get the cursor for shared content given the owner name
     * */
    getSharedContent(username) {
        return accessDb.find({owner: username});
    }

    /**
     * Get the cursor for shared content given the candidate name
     * */
    getSharedWithMeContent(candidate) {
        return accessDb.find({candidate: candidate});
    }

    /**
     * JSON {
     *      owner: owner of the folder.file
     *      candidate: with whom the content is shared
     *      path: file path
     * }
     * */
    revokeAccess(shareObj) {
        accessDb.remove(shareObj, function (err, numRemoved) {
            if (err) {
                console.error('DB ERROR', err);
            }
            if (numRemoved === 0) {
                console.info(`shared content owned by ${shareObj.owner};
                shared with ${shareObj.candidate} with path ${shareObj.path} not found`);
            }
        });
    }

    handleError(result, msg, err) {
        console.error(msg, err);
        result.error = msg;
    }

}
