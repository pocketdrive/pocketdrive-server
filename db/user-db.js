import * as databases from './dbs';
import * as jwt from 'jsonwebtoken';

/**
 * @author dulajra
 */
export class UserDbHandler {

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
                            let token = jwt.sign(doc, process.env.JWT_SECRET);

                            databases.userDb.update({username: doc.username}, {$set: {token: token}}, {}, (err, numReplaced) => {
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

    handleError(result, msg, err) {
        if (arguments.length === 2) {
            console.error(msg);
        } else {
            console.error(msg);
        }
        result.error = msg;
    }

}
