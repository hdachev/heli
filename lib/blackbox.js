

// this is a flight recorder that i'm planning to use
// in my attempts to build up the multiplayer tooling.

(function() {
  /*global localStorage:false*/

  var id = "z" + Math.round(Math.random() * 0xffff).toString(16);


  //

  GAME.startRecording = function() { };
  GAME.persistRecording = function() { };


  //

  GAME.replayRecording = function() {
    var rec = localStorage.getItem("flight_rec")
      , data, i = 0;

    try {
      data = JSON.parse(rec);
    } catch(e) {}

    // start replaying.
    if (data)
      setInterval(function() {
        var state = data[i++];

        if (state) {

          // the old stuff
          // GAME.updateTracker(state, Date.now() / 1000);

          // ---
          // the new stuff
          // fill in the blanks
          state.rev = i;
          state.t = 'v'; // vehicle
          state.m = 'bubl'; // bubbleship

          // send the update via the connection -
          // so long as you see it, multiplayer works
          GAME.sendObjectUpdate(id, state);
        }
      }, 1000);
  };


  // TEMP
  // mock stuff until some other stuff

  GAME.isLocallyOwned = function(uuid) {
    return uuid === id;
  };

  GAME.forEachLocallyOwned = function(f) {
    f(id);
  };

}
());

