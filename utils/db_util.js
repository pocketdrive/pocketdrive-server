/**
 * Created by anuradhawick on 6/10/17.
 */
import DataStore from 'nedb';

const userDb = new DataStore({filename: process.env.NE_DB_PATH_USER, autoload: true});
const accessDb = new DataStore({filename: process.env.NE_DB_PATH_ACCESS, autoload: true});

export class DBHandler {
    /**
     * JSON {
     *      username: string
     *      password: string
     * }
     * */
    addUser(userObj) {
        let result = { success: false };

        return new Promise((resolve) => {
            userDb.findOne({ username: userObj.username}, function (err, doc) {
                if (doc !== null) {
                    delete doc.password; 
                    console.warn('Username already exists', doc);
                    result['error'] = 'Username already exists';
                    resolve(result);
                } else {
                    userDb.insert(userObj, function (err, newDoc) {
                        if (err) {
                            console.error('Database error. Adding new user failed', err);
                            result['error'] = 'Database error. Adding new user failed';
                        } else {
                            result.success = true;
                        }
                        resolve(result);
                    });
                }            
            });
        });
            
    }

    /**
     * Get the user given the username
     * returns { username, password}
     * */
    searchUser(username) {
        return userDb.findOne({username: username});
    }

    /**
     * Remove user given the username
     * */
    removeUser(username) {
        userDb.remove({username: username}, {}, function (err, numRemoved) {
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
        userDb.update({username: userObj.username}, {password: userObj.password}, function (err, numReplaced) {
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

}
