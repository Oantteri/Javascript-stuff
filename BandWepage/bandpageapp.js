var express = require('express');
var app = express();
var server = require('http').createServer(app);

const bodyParser = require('body-parser');
const path = require('path');
const NodeCouchDb = require('node-couchdb');
const http = require('http');
const io = require('socket.io')(server);

var port = 8080; //for testing purposes

const couch = new NodeCouchDb({
    auth: {
      user: 'admin',
      password: 'admin'
    }
});

//Cloudant API keys & password
//Key:aveatcracedgeducheysfain
//Password:5f77a38522eb4d3611793a7dcd9cb26e90dbac09
//const viewUrl = https://bandapp.cloudant.com/bandpage/_design/albums/_view/allinfo

const dbName = 'bandpage';
const viewUrl = '/_design/albums/_view/allinfo';

couch.listDatabases().then(function(dbs){
    console.log(dbs);
})




app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '/public/css/')));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res){
      res.sendFile(__dirname+ '/views/index.html');
});
//redirect, 'cuz lazy
app.get('/index.html', function(req, res){
      res.sendFile(__dirname+ '/views/index.html');
});

app.get('/yhteydenotto.html', function(req, res){
      res.sendFile(__dirname+ '/views/yhteydenotto.html');
});

app.get('/chat.html', function(req, res){
  res.sendFile(__dirname+'/views/chat.html');

//This from the socket.io example.
  var numUsers = 0;

  io.on('connection', function (socket) {
    var addedUser = false;

    // when the client emits 'new message', this listens and executes
    socket.on('new message', function (data) {
      // we tell the client to execute 'new message'
      socket.broadcast.emit('new message', {
        username: socket.username,
        message: data
      });
    });

    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (username) {
      if (addedUser) return;

      // we store the username in the socket session for this client
      socket.username = username;
      ++numUsers;
      addedUser = true;
      socket.emit('login', {
        numUsers: numUsers
      });
      // echo globally (all clients) that a person has connected
      socket.broadcast.emit('user joined', {
        username: socket.username,
        numUsers: numUsers
      });
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {
      socket.broadcast.emit('typing', {
        username: socket.username
      });
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', function () {
      socket.broadcast.emit('stop typing', {
        username: socket.username
      });
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
      if (addedUser) {
        --numUsers;

        // echo globally that this client has left
        socket.broadcast.emit('user left', {
          username: socket.username,
          numUsers: numUsers
        });
      }
    });
  });
    });

//database implementation, pretty basic stuff
app.get('/albumit', function(req, res){
  couch.get(dbName, viewUrl).then(
    function(data, headers, status){
      console.log(data.data.rows);
      res.render(__dirname+ '/views/albumit', {
        bandpage:data.data.rows
      });
    res.send(err);
    },
    function(err){

    });
});
app.post('/album/add', function(req, res){
  const name = req.body.name;
  const artist = req.body.artist;
  const published = req.body.published;
  const publisher = req.body.publisher;


  couch.uniqid().then(function(ids) {
    const id = ids[0];

    couch.insert(dbName, {
      _id:id,
      name: name,
      artist: artist,
      published: published,
      publisher: publisher,


    }).then(
      function(data, headers, status){
        res.redirect('/albumit');

      },
      function(err){
        res.send(err);
    });
  })
  });

  app.post('/album/update/:id', function(req, res){
    const id = req.params.id;
    const rev = req.body.rev;
    const name = req.body.name;
    const artist = req.body.artist;
    const published = req.body.published;
    const publisher = req.body.publisher;

      couch.update(dbName, {
        _id: id,
        _rev: rev,
        name: name,
        artist: artist,
        published: published,
        publisher: publisher,

      }).then(
        function(data, headers, status){
          res.redirect('/albumit');

        },
        function(err){
          res.send(err);
      });
    });

app.post('/album/delete/:id', function(req, res){

  const id = req.params.id;
  const rev = req.body.rev;

  couch.del(dbName, id, rev).then(
    function(data, headers, status){
      res.redirect('/albumit');
    },
    function(err){
      res.send(err);
  });
});

server.listen(port, function(){
  console.log('Server listening on port' + port);
});
