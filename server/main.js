
var shards = {}
  , server

  , PING = 'p';


// ------
// SHARDS

// Game world + maintenance -

var shards = {};

function Shard(skey) {
  this.skey = skey;
  this.state = {};
  this.times = {};

  // shard clients
  this.clients = [];
}

function getShard(skey) {
  return shards[skey] || (shards[skey] = new Shard(skey));
}

setInterval(function() {
  var now = Date.now()
    , skey, shard, dead
    , times, state, clients
    , key, i, n
    , client, lag;

  for (skey in shards) {
    shard = shards[skey];
    times = shard.times;
    state = shard.state;

    dead = true;

    // forget old state -
    for (key in times)
      if (now - times[key] > 5000) {
        delete state[key];
        delete times[key];
      }
      else
        dead = false;

    // drop old clients -
    clients = shard.clients;
    n = clients.length;
    for (i = 0; i < n; i ++) {
      client = clients[i];
      lag = now - client.ts;
      if (lag > 5000) {
        clients.splice(i, 1);
        i --;
        n --;
      }
      else {
        dead = false;

        // ping clients periodically
        if (now - client.ping > 1000) {
          client.ping = now;
          client.send(PING);
        }
      }
    }

    // forget dead shards -
    if (dead)
      delete shards[skey];
  }

}, 1000);


// -------
// CLIENTS

// Managing game state -

function upsertObject(skey, key, raw) {
  var now = Date.now()
    , shard = getShard(skey)
    , clients, i, n;

  // keep track -
  shard.state[key] = raw;
  shard.times[key] = now;

  // update all subscribers -
  clients = shard.clients;

  n = clients.length;
  for (i = 0; i < n; i++)
    clients[i].send(raw);
}


// Managing clients -

function setClientSubscription(client, skeys) {
  var prev = client.skeys
    , i, n, skey, shard, x
    , state, key;

  // unsubscribe
  n = prev.length;
  for (i = 0; i < n; i++) {
    skey = prev[i];
    if (skeys.indexOf(skey) < 0) {
      shard = shards[skey];
      if (!shard)
        continue;

      x = shard.clients.indexOf(client);
      if (x >= 0)
        shard.clients.splice(x, 1);
    }
  }

  // subscribe
  n = skeys.length;
  for (i = 0; i < n; i++) {
    skey = skeys[i];
    shard = getShard(skey);
    if (shard.clients.indexOf(client) < 0) {
      shard.clients.push(client);

      // send all shard state to the client
      state = shard.state;
      for (key in state)
        client.send(state[key]);
    }
  }

  // that's all there is to it
  client.skeys = skeys;
}


// ------
// SERVER

function handleMessage(client, cmd, msg) {
  var params;

  // subscribe
  if (cmd === 's') {
    params = msg.split(' ', 9); // cmd + up to 8 skeys
    setClientSubscription(client, params.slice(1));
  }

  // update
  else if (cmd === 'u') {
    params = msg.split(' ', 3); // cmd + skey + key + data
    upsertObject(params[1], params[2], msg);
  }

  // team chat
  else if (cmd === 't') {
    // TODO
  }
}

server = new (require('ws').Server)({
  port: process.env.PORT || 8080
});

function Client(ws) {
  var now = Date.now();

  // websocket and last seen
  this.ws = ws;
  this.ts = now;

  // current subscription
  this.skeys = [];

  // ping straight away
  this.ping = now;
  this.send(PING);
}

Client.prototype.send = function(msg) {
  try {
    this.ws.send(msg);
  }
  catch (err) {
    this.error(err);
  }
};

Client.prototype.error = function(e) {
  console.log('ws/err', e);
  setClientSubscription(this, []);
};

server.on('connection', function(ws) {
  var client = new Client(ws);

  // detach the client on error
  ws.on('error', function(err) {
    client.error(err);
  });

  ws.on('message', function(msg) {
    var n, cmd;

    n = msg.length;
    if (!n || n > 1024 || /[^ -~]/.test(msg))
      return;

    // its alive!
    client.ts = Date.now();

    // pong ends here
    cmd = msg.charAt(0);
    if (cmd === 'p')
      return;

    // exec
    handleMessage(client, cmd, msg);
  });
});

