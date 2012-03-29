var express = require('express');
var redis = require('redis');

//var db = redis.createClient(6379);
var app = express.createServer();

// db.on('error', function(err) {
//     console.log(err);
//     db.quit();
// });

app.configure(function() {
    app.set('views', __dirname + '/templates');
    app.set('view options', { layout: false });
    app.use(express.bodyParser());
    app.use(express.methodOverride);
    app.use(express.static(__dirname + '/static'));
});

app.get('/', function(req, res) {
    res.render('index.html');
    res.end();
});

app.post('/screenshot', function(req, res) {
    console.log(req.body.james);
});

app.listen(4000);