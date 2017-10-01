import express from 'express';
import ShareFolder from "../share-folder-backend/share-folder";
import ShareFolderDbHandler from "../db/share-folder-db";


const router = express.Router();

router.post('/', function (req, res, next) {
    res.set('Content-Type', 'application/json');

    console.log("/share-folder");

   ShareFolder.share(req.body,(result)=>{

       if(result.success){
           console.log(result);
           ShareFolderDbHandler.shareFolder(req.body,result.candidate).then((result)=>{
              if(result.success){
                  res.end(JSON.stringify(result));
              }
           });
       }else{
           res.end(JSON.stringify(result));
       }
       // console.log(result);

   });




});

module.exports = router;