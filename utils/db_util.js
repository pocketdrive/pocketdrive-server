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
        // find if there is a user already and abort action
        userDb.findOne({ username: userObj.username}, function (err, doc) {
            if (doc !== null) {
                console.warn('User already exists', doc);
            } else {
                userDb.insert(userObj, function (err, newDoc) {
                    if (err) {
                        console.error('DB ERROR', err);
                    }
                });
            }
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
                console.info(`shared content owned by ${shareObj.owner} \
                shared with ${shareObj.candidate} with path ${shareObj.path} not found`);
            }
        });
    }

}
