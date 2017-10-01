import * as databases from './dbs';
import * as _ from 'lodash';

/**
 * @author dulajra
 */
export default class UserDbHandler {

    /**
     * userObj = {
     *      username: string
     *      password: string
     *      firstname: string
     *      lastname: string
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
                    this.handleError(result, 'Username already exists');
                    resolve(result);
                } else {
                    databases.userDb.insert(userObj, (err, doc) => {
                        if (err) {
                            this.handleError(result, 'Database error. Adding new user failed', err);
                            resolve(result);
                        } else {
                            result.success = true;
                        }

                        resolve(result);
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

    getAllUsers() {
        let result = {success: false};

        return new Promise((resolve) => {
            databases.userDb.find({}, (err, doc) => {
                if (err) {
                    this.handleError(result, 'Database error. Find users failed', err);
                    resolve(result);
                } else if (doc !== null) {
                    result.success = true;
                    result.data = doc;
                    resolve(result);
                }
            });
        });
    }

    checkUsernames(candidates) {
        let result = {success: false};
        let itemsProcessed = 0;

        return new Promise((resolve) => {
            _.each(candidates, (candidate) => {
                databases.userDb.findOne({username: candidate.username}, (err, doc) => {
                    itemsProcessed++;
                    if (err) {
                        itemsProcessed--;
                        this.handleError(result, 'Database error. Find user failed', err);
                        resolve(result);
                    } else if (!doc) {
                        itemsProcessed--;
                        result.incorrectUsername = candidate.username;
                        console.log('here   ');
                        resolve(result);
                    }
                    if (itemsProcessed === candidates.length) {
                        result.success = true;
                        resolve(result);
                    }
                });
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
