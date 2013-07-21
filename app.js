var express = require('express');
var http = require('http');
var path = require('path');
var socketio = require('socket.io');
var facebook = require('facebook-node-sdk');
var MongoStore = require('connect-mongo')(express);
var routes = require('./routes');
var socket = require('./socket');
var config = require('./config');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('friendsfighter'));
app.use(express.session({
  secret: 'byvprof',
  store: new MongoStore(config.mongodb)
}));
app.use(facebook.middleware(config.facebook));
app.use(app.router);
app.use(require('connect-assets')({
  src: path.join(__dirname, 'frontend'),
  buildDir: 'public',
}));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// Routes
routes.configure(app);

// Socket.io configuration
var server = http.createServer(app);
var io = socketio.listen(server);
socket.configure(io);

server.listen(app.get('port'), function() {
  console.log('Server listening on port ' + app.get('port'));
});
