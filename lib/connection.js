

// first sketch of the server interface
// i'll patch the blackboxes through this to simulate a full multiplayer setup.
// i want missiles to be managed by the player they're fired at so i need this before i have the rest.

(function() {


  // Connections impl

  // websocket connection
  function WSConnection(host, onData) {
    /*global WebSocket:false*/

    var self = this
      , ws = new WebSocket('ws://' + host)
      , ts = Date.now();

    // error handler
    ws.onerror = function(e) {

      // DEBUG -
      GAME.log(e);

      self.error = e || "Unknown error.";
      try { ws.close(); } catch (err) {}
    };

    // sender
    this.send = function(msg) {

      // disconnect on message timeout
      var now = Date.now();
      if (now - ts > 5000) {

        self.error = "Timeout.";
        try { ws.close(); } catch (err) {}
        return;
      }

      // try send. cant be bothered to research the reasons why this might fail
      try { ws.send(msg); } catch (err) { }
    };

    // receiver
    ws.onmessage = function(e) {
      var msg = e && e.data;
      if (typeof msg !== 'string')
        return;

      // it's alive!
      ts = Date.now();

      // pong
      if (msg === 'p') {

        try { ws.send('p'); } catch(err) { }

        return;
      }

      // upsert
      onData(msg);
    };
  }

  function FakeConnection(onData) {
    this.send = function(msg) {
      setTimeout(function() {
        onData(msg);
      }, 100);
    };
  }


  // shard keys -
  // hex+hex / hex-hex and the like, player will be able to access about

  function getShardKey(x, y) {
    var key = Math.round(x / 10000).toString(16);
    if (y >= 0)
      key += '+';

    return key + Math.round(y / 10000).toString(16);
  }

  function getShardKeysAround(x, y) {
    var i, j, keys = [];
    for (i = -1; i < 2; i ++)
      for (j = -1; j < 2; j ++)
        keys.push(getShardKey(
          x + i * 10000
        , y + j * 10000
        ));

    return keys;
  }


  // Remote data handler

  function handleMessage(msg) {
    var raw = /^u [^ ]+ ([a-zA-Z0-9]+) (\{[ -~]+\})/.exec(msg)
      , data, handler;

    // parse
    if (raw) try {
      data = JSON.parse(raw[2]);
    }
    catch (e) { }

    // updateObject(key, state);
    if (data) {
      handler = GAME.updateHandlers[data.t];
      if (handler)
        handler(raw[1], data); // id/data
    }
  }


  // Connector.

  function connect() {
    var host = GAME.host;
    if (host)
      return new WSConnection(host, handleMessage);
    else
      return new FakeConnection(handleMessage);
  }


  // Sender.

  var connection;
  GAME.sendObjectUpdate = function(shardVec, key, state) {
    var skey = getShardKey(shardVec.x, shardVec.z);

    // Connect/send.
    if (!connection || connection.error)
      connection = connect();
    else
      connection.send("u " + skey + " " + key + " " + JSON.stringify(state));
  };


  // Coord resub.
  setInterval(function() {

    // subscribe for updates around the camera position
    if (connection && !connection.error)
      connection.send("s "
      + getShardKeysAround(
          GAME.camera.position.x
        , GAME.camera.position.z
        )
        .join(' ')
      );

  }, 1000);


}
());

