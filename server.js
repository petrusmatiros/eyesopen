var http = require('http');
var fs = require('fs');
var url = require('url');
var path = require('path');

var mimetypes = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'png': 'image/png',
    'jpeg': 'image/jpeg',
    'jpg': 'image/jpg'
};

var portname = '127.0.0.1';
var port = 3000;
var __dirname = "public"
var server = http.createServer((req, res) => {
    var myuri = url.parse(req.url).pathname;
    var filename = path.join(__dirname, unescape(myuri));
    console.log('File you are looking for is:' + filename);
    var loadFile;

    try {
        loadFile = fs.lstatSync(filename);
    } catch (error) {
        res.writeHead(404, {
            "Content-Type": 'text/plain'
        });
        res.write('404 Internal Error');
        res.end();
        return;
    }

    if (loadFile.isFile()) {
        var mimeType = mimetypes[path.extname(filename).split('.').reverse()[0]];
        res.writeHead(200, {
            "Content-Type": mimeType
        });
        var filestream = fs.createReadStream(filename);
        filestream.pipe(res);
    } else if (loadFile.isDirectory()) {
        res.writeHead(302, {
            'Location': 'index.html'
        });
        res.end();
    } else {
        res.writeHead(500, {
            "Content-Type": 'text/plain'
        });
        res.write('500 Internal Error');
        res.end();
    }

})

server.listen(port, portname, () => {
    console.log(`Server is running on server http://${portname}:${port}`);
});

