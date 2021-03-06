var socket = io.connect(location.hostname);

var theFight;
var initials = [];
var spellSet;
var left, right;
var spellEnabled = [false, false];

socket.on('connection', function(data) {
  spellSet = data.spellSet;
  socket.emit('new_fight', {
    myself: myself,
    opponent: opponent
  });
});

socket.on('new_fight', function(fight) {
  theFight = fight;
  initials = fight.players;
  view.initialize(fight);
  view.disableSpell();
  view.update(fight);
  if (fight.players[0].id == myself) {
    left = true;
    right = false;
    socket.emit('start_fight', {fightID: fight.id});
  } else {
    left = false;
    right = true;
  }
  if (fight.both) {
    left = right = true;
  }
});

socket.on('decide', function(fight) {
  console.log(fight);
  theFight = fight;
  view.update(fight);
  view.disableSpell(fight.turn);
  view.disableSpell(1 - fight.turn);
  if ((left && fight.turn == 0) || (right && fight.turn == 1)) {
    view.enableSpell(fight.turn);
  }
});

socket.on('spell_effect', function(data) {
  var delta = data.delta;
  var player = data.player;
  var spellSetID = theFight.players[player].points.spellSet;
  var spell = spellSet[spellSetID][data.spellID];
  var text = '';
  if (delta.mHP || delta.mMP) {
    text += '<big>' + theFight.players[player].name + '</big><br>';
  }
  if (delta.mHP) {
    text += 'HP ' + addPositive(delta.mHP) + '<br>';
  }
  if (delta.mMP) {
    text += 'MP ' + addPositive(delta.mMP) + '<br>';
  }
  if (delta.oHP || delta.oHP) {
    text += '<big>' + theFight.players[1 - player].name + '</big><br>';
  }
  if (delta.oHP) {
    text += 'HP ' + addPositive(delta.oHP) + '<br>';
  }
  if (delta.oMP) {
    text += 'MP ' + addPositive(delta.oMP) + '<br>';
  }
  $('#center #player').html(theFight.players[player].name);
  $('#center #spell').html('<img src="/img/spells/' + spellSetID + data.spellID + '.png">');
  $('#center #spell-name').html(spell.name);
  $('#center #spell-effect').html(text);
});

socket.on('over', function(player) {
  var text = $('#center #spell-effect').html();
  text += '<big>' + theFight.players[player].name + '</big><br> Wins!';
  $('#center #spell-effect').html(text);
  theFight.players[1 - player].points.health = 0;
  view.setPlayer(1 - player, theFight);
});

socket.on('online_players', function(players) {
  view.updateOnlinePlayers(players);
});

var addPositive = function(num) {
  if (num > 0) {
    return '+' + num;
  } else {
    return num.toString();
  }
};

$(function() {
  $('#controls #new-game').click(view.onNewGameClick);
  $('#controls #connect').click(view.onConnectClick);
  $('#controls #ai').click(function() {
    bootbox.alert('Not implemented yet :(');
  });
});

var view = {};
view.barWidth = 150;

view.initialize = function(fight) {
  $('#player0 #spells button').each(function(id, spell) {
    $(spell).attr('disabled', true);
    $(spell).click({player:0, id: id}, view.onSpellClick);
  });
  $('#player1 #spells button').each(function(id, spell) {
    $(spell).attr('disabled', true);
    $(spell).click({player:1, id: id}, view.onSpellClick);
  });
  $('#friends').hide();
  $('#online').hide();
};

view.update = function(fight) {
  view.setPlayer(0, fight);
  view.setPlayer(1, fight);
};

view.getPlayer = function(player) {
  if (player == 0) {
    return $('#player0');
  } else {
    return $('#player1');
  }
}

view.enableSpell = function(player) {
  spellEnabled[player] = true;
  player = view.getPlayer(player);
  $('#spells button', player).each(function(id, spell) {
    $(spell).attr('disabled', false);
    $(spell).show();
  });
};

view.disableSpell = function(player) {
  spellEnabled[player] = false;
  player = view.getPlayer(player);
  $('#spells button', player).each(function(id, spell) {
    $(spell).attr('disabled', true);
    $(spell).hide();
  });
};

view.setPlayer = function(player, fight) {
  var initial;
  var data = fight.players[player];
  if (player == 0) {
    player = $('#player0');
    initial = initials[0];
  } else {
    player = $('#player1');
    initial = initials[1];
  }
  $('#name', player).html(data.name);
  $('#profile', player).attr('src', data.img);
  if (data.points.health > initial.points.health) {
    initial.points.health = data.points.health;
  }
  if (data.points.mana > initial.points.mana) {
    initial.points.mana = data.points.mana;
  }
  $('#health', player).html(data.points.health)
    .width(data.points.health / initial.points.health * view.barWidth);
  $('#mana', player).html(data.points.mana)
    .width(data.points.mana / initial.points.mana * view.barWidth);
  $('#power', player).html(data.points.power).width(view.barWidth);
  $('#defence', player).html(data.points.defence).width(view.barWidth);
  $('.health-consumed', player).width((1 - data.points.health / initial.points.health) * view.barWidth);
  $('.mana-consumed', player).width((1 - data.points.mana / initial.points.mana) * view.barWidth);
  for (var i = 0; i < 5; i++) {
    var spell = $('#spell' + i + ' img', player);
    var spellInfo = spellSet[data.points.spellSet][i];
    var title = '<big>' + spellInfo.name + '</big>';
    if (spellInfo.mMP) {
      title += '<br>MP: ' + addPositive(spellInfo.mMP);
    }
    if (spellInfo.mHP) {
      title += '<br>HP: ' + addPositive(spellInfo.mHP);
    }
    if (spellInfo.oMP || spellInfo.oHP) {
      title += '<br>Damage';
    }
    if (spellInfo.oMP) {
      title += '<br>MP: ' + addPositive(spellInfo.oMP);
    }
    if (spellInfo.oHP) {
      title += '<br>HP: ' + addPositive(spellInfo.oHP);
    }
    spell.attr('src', '/img/spells/' + data.points.spellSet + i + '.png');
    spell.attr('title', title);
    spell.tipsy({gravity: 'nw', html: true});
  }
};

view.onSpellClick = function(event) {
  var player = event.data.player;
  var spellID = event.data.id;
  if (!spellEnabled[player]) {
    return false;
  }
  var spell = spellSet[theFight.players[player].points.spellSet][spellID];
  if (theFight.players[player].points.mana + spell.mMP < 0) {
    bootbox.alert('Not enough mana!');
    return false;
  }
  if (theFight.players[player].points.health + spell.mHP < 0) {
    bootbox.alert('Not enough health!');
    return false;
  }
  view.disableSpell(player);
  socket.emit('spell', {
    fightID: theFight.id,
    player: theFight.turn,
    spellID: spellID
  });
};

view.onNewGameClick = function() {
  $('#friends').show(200);
  $('#online').hide();
};

view.onConnectClick = function() {
  $('#friends').hide();
  $('#online').show(200);
  socket.emit('online', myself);
};

view.updateOnlinePlayers = function(players) {
  $('#online #players').html('');
  var html = '';
  players.forEach(function(player) {
    html += '<a href="#" onclick="view.onConnectPlayerClick(' + player + ')"><img src="/img/profiles/thumbs/' + player + '.jpg"></a>';
  });
  $('#online #players').html(html);
};

view.onConnectPlayerClick = function(player) {
  if (player == myself) {
    bootbox.alert('You can not connect to yourself.');
    return false;
  }
  socket.emit('connect', {
    myself: myself,
    opponent: player
  });
  return false;
};
