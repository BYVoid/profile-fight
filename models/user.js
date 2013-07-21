'use continuation'
var db = require('./db');

var userSchema = new db.Schema({
  id: {
    type: String,
    index: true,
    unique: true
  },
  name: String,
  first_name: String,
  last_name: String,
  link: String,
  username: String,
  hometown: Object,
  location: Object,
  quotes: String,
  education: db.Schema.Types.Mixed,
  gender: String,
  religion: String,
  political: String,
  timezone: Number,
  locale: String,
  languages: db.Schema.Types.Mixed,
  verified: Boolean,
  updated_time: Date
});

module.exports = User = db.model('User', userSchema);
