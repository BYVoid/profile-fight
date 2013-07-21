'use continuation'
var db = require('./db');

var relationSchema = new db.Schema({
  a: {
    type: String,
    index: true
  },
  b: {
    type: String,
    index: true
  },
});

module.exports = User = db.model('Relation', relationSchema);
