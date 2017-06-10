/**
 * Created by anuradhawick on 6/10/17.
 */
import DataStore from 'nedb';

const userDb = new DataStore({filename: process.env.NE_DB_PATH_USER, autoload: true});
const accessDb = new DataStore({filename: process.env.NE_DB_PATH_ACCESS, autoload: true});

export class DBHandler {

    addUser(userObj) {
        userDb.insert(userObj, function (err, newDoc) {
            if (err) {
                console.error('DB ERROR', err);
            }
        });
    }

    searchUser(username) {
        userDb.findOne({username: username}, function (err, doc) {
            if (err) {
                console.error('DB ERROR', err);
            }
            if (doc === null) {
                console.info(`user ${username} no found`);
            }
        });
    }

    removeUser(username) {
        userDb.remove({username: username}, {}, function (err, numRemoved) {
            if (err) {
                console.error('DB ERROR', err);
            }
            if (numRemoved === 0) {
                console.info(`user ${username} no found`);
            }
        });
    }

    getAccessByUser(username) {

    }

    updateUser() {

    }

}
