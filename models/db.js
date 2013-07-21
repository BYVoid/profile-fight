'use continuation'
var mongoose = require('mongoose');
var util = require('util');
var config = require('../config');

var host = config.mongodb.host;
var port = config.mongodb.port;
var db = config.mongodb.db;
var address = util.format('mongodb://%s:%s/%s', host, port, db);

module.exports = mongoose;

mongoose.connect(address);
mongoose.connected = false;
mongoose.connection.on('open', function() {
  mongoose.connected = true;
  console.log('MongoDB Connected.');
});
