'use continuation'
var fs = require('fs');
var path = require('path');
var facebook = require('facebook-node-sdk');
var request = require('request');
var User = require('../models/user');
var Relation = require('../models/relation');

exports.configure = function(app) {
  app.all('/', facebook.loginRequired(), index);
  app.all('/fight', fight);
  app.all('/fight/:opponent', fight);
};

var index = function(req, res) {
  if (req.session.user) {
    res.redirect('/fight');
    return;
  }

  var downloadThumb = function(url, id, next) {
    request({url: url, encoding: null}, obtain(res, body));
    fs.writeFile(path.join(__dirname, '..', 'public', 'img', 'profiles', 'thumbs', id + '.jpg'), body, obtain());
    next();
  };
  req.facebook.api('/me', obtain(user));
  req.session.user = user;
  User.update({id: user.id}, user, {upsert: true}, obtain());
  req.facebook.api('/me/friends', {fields: 'id, name, picture'}, obtain(data));
  var friends = data.data;
  res.redirect('/fight');
  for (var i = 0; i < friends.length; i++) {
    var friend = friends[i];
    var picurl = friend.picture.data.url;
    friend.picture = undefined;
    var rela = {a: user.id, b: friend.id};
    var relb = {b: user.id, a: friend.id};
    parallel(
      User.update({id: friend.id}, friend, {upsert: true}, obtain()),
      Relation.update(rela, rela, {upsert: true}, obtain()),
      Relation.update(relb, relb, {upsert: true}, obtain()),
      downloadThumb(picurl, friend.id, obtain())
    );
    console.log(i);
  }
};

var fight = function(req, res) {
  var downloadProfile = function(id, next) {
    var url = 'http://graph.facebook.com/' + id + '/picture?width=200&height=200';
    request({url: url, encoding: null}, obtain(res, body));
    fs.writeFile(path.join(__dirname, '..', 'public', 'img', 'profiles', id + '.jpg'), body, obtain());
    next();
  };
  if (!req.session.user) {
    res.redirect('/');
    return;
  }
  var myself = req.session.user.id;
  var opponent = req.params.opponent;
  if (opponent) {
    Relation.findOne({a: myself, b: opponent}, obtain(rel));
    if (!rel) {
      opponent = null;
    }
  }
  Relation.find({a: myself}, obtain(friends));
  friends = friends.map(function(elem) {return elem.b});
  if (!opponent) {
    if (!friends || friends.length == 0) {
      opponent = req.session.user.id; // Yourself
    } else {
      // Pick random one
      opponent = friends[Math.round(friends.length * Math.random())];
    }
  }
  parallel(
    downloadProfile(myself, obtain()),
    downloadProfile(opponent, obtain())
  );
  res.render('fight', {
    myself: myself,
    opponent: opponent,
    friends: friends
  });
};
