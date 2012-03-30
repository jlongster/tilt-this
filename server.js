var express = require('express');
var redis = require('redis');
var _ = require('./underscore');
var uuid = require('node-uuid');

require('jinjs').registerExtension('.html');

var db = redis.createClient(6379);
var app = express.createServer();

db.on('error', function(err) {
    console.log(err);
    db.quit();
});

app.configure(function() {
    app.use(express.bodyParser());
    app.use(express.static(__dirname + '/static'));
    app.set('view options', { layout: false });
    app.set('view engine', 'jinjs');
    app.set('views', __dirname + '/templates');
});

app.get('/', function(req, res) {
    db.lrange('objects', 0, -1, function(err, lst) {
        db.mget(_.map(lst, function(el) {
            return 'object:' + el;
        }), function(err, lst) {
            lst = _.map(lst, JSON.parse);
            res.render('index', { objects: lst });
        });
    });
});

app.get('/clear', function(res, res) {
    db.lrange('objects', 0, -1, function(err, lst) {
        _.map(lst, function(i) {
            db.del('object:' + i);
        });
    });

    db.del('objects', function(err) {
        res.write('objects cleared');
        res.end();
    });
});

app.get('/object/:id', function(req, res) {
    db.get('object:' + req.params.id, function(err, obj) {
        res.render('object', JSON.parse(obj));
    });
});

app.post('/publish', function(req, res) {
    db.incr('next.object.id', function(err, id) {
        db.set('object:' + id, 
               JSON.stringify({ img: req.body.img,
                                html: req.body.html,
                                id: id }));
        db.lpush('objects', id);
    });
});

app.listen(4000);