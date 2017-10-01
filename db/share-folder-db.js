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

    static shareFolder(shareObj,candidate){
        let result = {success:false}

        return new Promise((resolve)=>{

            databases.shareDb.findOne({owner:shareObj.username_from,srcpath:shareObj.path},(err,doc)=>{
                if(err){
                    this.handleError(result, 'Database error. Share Folder Insertion failed', err);
                    resolve(result);
                }else if(!doc){
                    databases.shareDb.insert({owner:shareObj.username_from,srcpath:shareObj.path,foldername:shareObj.folder_name,candidates:[candidate] },(err,doc)=>{
                        console.log("In insert");
                        if(err){
                            this.handleError(result, 'Database error. Share Folder Insertion failed', err);
                            resolve(result);
                        }else if(!doc){
                            result.error = "Database insertion failed";
                            resolve(result);
                        }else{
                            result.success = true;
                            resolve(result);
                        }
                    })
                }else{
                    console.log("herererr");
                    databases.shareDb.update(doc,{$addToSet:{candidates:candidate}},{},(err,doc)=>{
                        if(doc){
                            result.success = true;
                            resolve(result);
                        }else if(err){
                            result.error = "Database update failed";
                            resolve(result);
                        }
                    });
                }
            })
        })
    }

    // static updateCandidate(shareObj,candidate){
    //     result = {success:false};
    //
    //     return new Promise((resolve)=>{
    //         databases.shareDb.findOne({ownerusername:shareObj.username_from,srcpath:shareObj.path},(err,doc)=>{
    //             if(err){
    //                 this.handleError(result, 'Database error. Find user failed', err);
    //                 resolve(result);
    //             }else if(!doc){
    //                 result.error ="Database entry couldn't be found";
    //                 resolve(result);
    //             }else{
    //
    //             }
    //         });
    //     });
    // }

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
            databases.userDb.find({},(err, doc) => {
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

    handleError(result, msg, err) {
        if (arguments.length === 3) {
            console.error(msg, err);
        } else {
            console.error(msg);
        }
        result.error = msg;
    }
}
