let express = require('express');
let bodyParser = require('body-parser');
let fs = require('fs')
let path = require('path')

let app = express();
app.use(bodyParser.json());

app.post('/signin', function (request, response) {
	response.writeHead(200, {'Content-Type': 'application/json'});

	// replace this with ldap code 
	console.log("/signin");
	let result = {"user": "dulaj", "password": "1234"};

	if(request.body.username == 'dulaj' && request.body.password == "1"){
		result["sharename"] = "dulaj";
		result["success"] = true;
	} else if(request.body.username == 'anuradha' && request.body.password == "2"){
		result["sharename"] = "anuradha";
		result["success"] = true;
	} else {
		result = {"success":false};
	}
	// end
	
	response.end(JSON.stringify(result));
})

app.get('/folder-list', function (request, response) {
	response.writeHead(200, {'Content-Type': 'application/json'});
	
	let user = request.query.username;
	let folderpath;

	// get the folder path from ldap db
	if(user == "dulaj"){
		folderpath = "/home/dulaj/dulaj/";
	} else if(user == "anuradha"){
		folderpath = "/home/dulaj/anuradha";
	}
	// end

	let dirs = walkSync(folderpath);
	response.end(JSON.stringify(dirs));

})

app.post('/list', function (request, response) {
	response.writeHead(200, {'Content-Type': 'application/json'});
	console.log("/list");
	
	let result = { "result": [ 
    {
        "name": "magento",
        "rights": "drwxr-xr-x",
        "size": "4096",
        "date": "2016-03-03 15:31:40",
        "type": "dir"
    }, {
        "name": "index.php",
        "rights": "-rw-r--r--",
        "size": "549923",
        "date": "2016-03-03 15:31:40",
        "type": "file"
    }
	]}

	response.end(JSON.stringify(result));

})


let server = app.listen(8080, function () {

	let host = server.address().address
	let port = server.address().port

	console.log("PocketDrive server listening at port %s", port)

})

function getDirectories (srcpath) {
  return fs.readdirSync(srcpath)
    .filter(file => fs.lstatSync(path.join(srcpath, file)).isDirectory())
}

var walkSync = function(dir) {  
	var items = [];
	if(dir[dir.length-1] != '/') dir=dir.concat('/')
	files = fs.readdirSync(dir);

	files.forEach(function(file) {
	console.log(file);
    if (fs.statSync(dir + file).isDirectory()) {
    	var item = {};
    	item['type'] = 'dir';
    	item['name'] = file;
    	item['path'] = dir + file;
		item['children'] = (walkSync(dir + file + '/'));
		items.push(item);
    }
    else {
    	var item={};
    	item['type'] = 'file';
    	item['name'] = file;
    	item['path'] = dir + file;
     	items.push(item);
    }
  });
  return items;
};
