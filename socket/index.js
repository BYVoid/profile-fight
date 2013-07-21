'use continuation'
var fs = require('fs');
var path = require('path');
var User = require('../models/user');

var fightID = 0;
var fights = {};
var onlines = {};

var Fight = function(id, players, sockets) {
  this.id = id;
  this.startTime = new Date();
  this.players = players;
  this.sockets = sockets;
  this.turn = 0;
  this.both = true;
};

Fight.prototype.toObject = function() {
  return {
    id: this.id,
    players: this.players,
    turn: this.turn,
    both: this.both
  };
};

Fight.prototype.notifyBoth = function(event, data) {
  this.sockets[0].emit(event, data);
  if (this.sockets[1].id != this.sockets[0].id) {
    this.sockets[1].emit(event, data);
  }
};

var Spell = function(name, mHP, mMP, oHP, oMP) {
  this.name = name;
  this.mHP = mHP;
  this.mMP = mMP;
  this.oHP = oHP;
  this.oMP = oMP;
};

var spellSet = [
  [
    new Spell('Holy Revive', 0, 15, 0, 0),
    new Spell('Sacred Strike', 0, -20, -30, 0),
    new Spell('Justice', 0, -40, -45, 0),
    new Spell('Judgement', 0, -30, -20, -20),
    new Spell('Aspiration', 60, -30, 0, 0)
  ], [
    new Spell('Inspiration', 5, 14, 0, 0),
    new Spell('Ice Shard', 0, -21, -35, 0),
    new Spell('Ice Shock', 0, -35, -45, 0),
    new Spell('Freeze', 0, -20, -5, -25),
    new Spell('Foresee', 60, -35, 0, 0)
  ], [
    new Spell('Fire Shield', 0, 20, 0, 0),
    new Spell('Sear', 0, -15, -25, 0),
    new Spell('Corrode', 0, -40, -25, -20),
    new Spell('Erupt', -20, -40, -65, 0),
    new Spell('Reincarnate', 30, -15, 0, 0)
  ], [
    new Spell('Shadow Shield', 10, 10, 0, 0),
    new Spell('Curse', 0, -20, -30, 0),
    new Spell('Wither', 0, -50, -55, 0),
    new Spell('Intoxicate', -65, +30, 0, -30),
    new Spell('Arise', 85, -45, 0, 0)
  ], [
    new Spell('Disguise', 18, 5, 0, 0),
    new Spell('Raid', 0, -15, -30, 0),
    new Spell('Assassinate', 0, -25, -45, 0),
    new Spell('Ambush', 0, -35, -40, -20),
    new Spell('Recuperate', 35, -15, 0, 0)
  ], [
    new Spell('Camouflage', 10, 10, 0, 0),
    new Spell('Shoot', 0, -22, -33, 0),
    new Spell('Storm', 0, -40, -45, 0),
    new Spell('Viper Attack', 0, -40, -5, -30),
    new Spell('Accelerate', 50, -25, 0, 0)
  ]
];

exports.configure = function(io) {
  io.sockets.on('connection', function(socket) {
    socket.emit('connection', {
      spellSet: spellSet
    });
    socket.on('new_fight', newFight(socket));
    socket.on('start_fight', startFight);
    socket.on('spell', spell);
    socket.on('online', online(socket));
    socket.on('connect', connect(socket));
  });
};

var generatePoints = function(buffer) {
  var BKDRHash = function(buffer, seed) {
    if (!seed) {
      seed = 131;
    }
    var hash = 0;
    for (var i = 0; i < buffer.length; i++) {
      var ch = buffer.readUInt8(i);
      hash = (hash * seed + ch) & 0x7FFFFF;
    }
    return hash;
  };

  var health = 100 + BKDRHash(buffer, 131) % 100;
  var mana = 60 + BKDRHash(buffer, 31) % 35;
  var power = 5 + BKDRHash(buffer, 1310) % 7;
  var defence = 2 + BKDRHash(buffer, 131313) % 5;
  return {
    health: health,
    mana: mana,
    power: power,
    defence: defence,
    spellSet: (health + mana) % spellSet.length
  };
};

var initializePlayer = function(id, next) {
  var profile = '/img/profiles/' + id + '.jpg';
  var profilePath = path.join(__dirname, '..', 'public') + profile;
  fs.readFile(profilePath, obtain(profileData));
  User.findOne({id: id}, obtain(user));
  next(null, {
    id: id,
    name: user.name,
    img: profile,
    points: generatePoints(profileData)
  });
};

var allocateFight = function(data, socket1, socket2, next) {
  fightID++;
  initializePlayer(data.myself, obtain(player1));
  initializePlayer(data.opponent, obtain(player2));
  var fight = new Fight(fightID, [player1, player2], [socket1, socket2]);
  fights[fightID] = fight;
  next(null, fight);
};

var newFight = function(socket) {
  return function(data) {
    try {
      allocateFight(data, socket, socket, obtain(fight));
      fight.notifyBoth('new_fight', fight.toObject());
    } catch (err) {
      console.error(err.stack);
    }
  };
};

var startFight = function(data) {
  var fight = fights[data.fightID];
  if (!fight) {
    // TODO exception
    return;
  }
  fight.notifyBoth('decide', fight.toObject());
  fight.turn = 1 - fight.turn;
};

var spell = function(data) {
  var fight = fights[data.fightID];
  if (!fight) {
    // TODO exception
    return;
  }
  var player = fight.players[data.player];
  var foe = fight.players[1 - data.player];
  var spell = spellSet[player.points.spellSet][data.spellID];
  if (player.points.mana + spell.mMP < 0 || player.points.health + spell.mHP < 0) {
    // TODO Not enough health or mana
    return;
  }
  var delta = {};
  if (spell.mHP != 0) {
    delta.mHP = spell.mHP;
    player.points.health += delta.mHP;
  }
  if (spell.mMP != 0) {
    delta.mMP = spell.mMP;
    player.points.mana += delta.mMP;
  }
  if (spell.oHP != 0) {
    delta.oHP = spell.oHP - player.points.power + foe.points.defence;
    foe.points.health += delta.oHP;
  }
  if (spell.oMP != 0) {
    delta.oMP = spell.oMP - player.points.power + foe.points.defence;
    foe.points.mana += delta.oMP;
    if (foe.points.mana < 0) {
      foe.points.mana = 0;
    }
  }
  var effect = {
    player: data.player,
    delta: delta,
    spellID: data.spellID
  };
  fight.notifyBoth('spell_effect', effect);
  if (foe.points.health <= 0) {
    fight.notifyBoth('over', data.player);
    return;
  }
  fight.notifyBoth('decide', fight.toObject());
  fight.turn = 1 - fight.turn;
};

var broadcastOnline = function() {
  var players = [];
  Object.keys(onlines).forEach(function(player) {
    var socket = onlines[player];
    if (socket.disconnected) {
      delete onlines[player];
    } else {
      players.push(player);
    }
  });
  Object.keys(onlines).forEach(function(player) {
    var socket = onlines[player];
    socket.emit('online_players', players);
  });
};

var online = function(socket) {
  return function(player) {
    onlines[player] = socket;
    broadcastOnline();
  };
};

var connect = function(socket) {
  return function(data) {
    var socket1 = onlines[data.myself];
    var socket2 = onlines[data.opponent];
    if (socket1 && socket2) {
      allocateFight(data, socket1, socket2, obtain(fight));
      fight.both = false;
      fight.notifyBoth('new_fight', fight.toObject());
    }
    delete onlines[data.myself];
    delete onlines[data.opponent];
    broadcastOnline();
  };
};
