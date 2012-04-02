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
    app.use(express.cookieParser());
    app.use(express.static(__dirname + '/static'));
    app.set('view options', { layout: false });
    app.set('view engine', 'jinjs');
    app.set('views', __dirname + '/templates');
});

app.get('/', function(req, res) {
    db.lrange('objects', 0, 15, function(err, lst) {
        db.mget(_.map(lst, function(el) {
            return 'object:' + el;
        }), function(err, objs) {
            db.zrevrange('votes', 0, 3, function(err, lst) {
                db.mget(lst, function(err, favs) {
                    objs = _.map(objs, JSON.parse);
                    favs = _.map(favs, JSON.parse);
                    res.render('index', { objects: objs,
                                          favs: favs});
                });
            });
        });
    });
});

app.get('/instructions', function(req, res) {
    res.render('instructions');
});

app.get('/clear', function(res, res) {
    db.lrange('objects', 0, -1, function(err, lst) {
        _.map(lst, function(i) {
            db.del('object:' + i);
        });
    });

    db.del('votes');

    db.del('objects', function(err) {
        res.write('objects cleared');
        res.end();
    });

});

app.get('/object/:id', function(req, res) {
    db.get('object:' + req.params.id, function(err, obj) {
        var obj = JSON.parse(obj);
        obj.voted = req.cookies['voted_' + obj.id];
        res.render('object', obj);
    });
});

app.get('/object-raw/:id', function(req, res) {
    db.get('object:' + req.params.id, function(err, obj) {
        res.write(obj);
        res.end();
    });
});

app.get('/vote/:id', function(req, res) {
    var id = req.params.id;
    db.zincrby('votes', 1, 'object:' + id);
    res.cookie('voted_' + id, 'yes', { path :'/' });
    res.redirect('/object/' + id);
});

app.post('/publish', function(req, res) {
    db.incr('next.object.id', function(err, id) {
        db.set('object:' + id, 
               JSON.stringify({ html: req.body.html,
                                name: req.body.name,
                                id: id,
                                depths: req.body.depths }));
        db.lpush('objects', id);

        res.write('' + id);
        res.end();
    });
});

app.listen(4000);