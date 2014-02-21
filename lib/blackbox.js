

// this is a flight recorder that i'm planning to use
// in my attempts to build up the multiplayer tooling.

(function() {
  /*global localStorage:false*/

  var history = [];

  //
  function describe(flyer) {

    // project the following 3 seconds
    // of movement among the current vector
    var projection = flyer.extrapolateMovement();
    return projection;
  }

  //
  GAME.startRecording = function(flyer) {
    function observe() {
      history.push(describe(flyer));

      // persist no more than 2 minutes of recording
      if (history.length < 120)
        setTimeout(observe, 1000);
    }

    // make an observation every second
    observe(flyer);
  };

  //
  GAME.persistRecording = function() {

    localStorage.setItem("flight_rec", JSON.stringify(history));
  };

  //
  GAME.replayRecording = function() {
    var rec = localStorage.getItem("flight_rec")
      , data, i = 0
      , id = "memo" + Math.round(Math.random() * 0xffffff).toString(16);

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
          state.t = 'v'; // vehicle
          state.v = 'bubble'; // bubbleship

          // send the update via the connection -
          // so long as you see it, multiplayer works
          GAME.sendObjectUpdate(
            {x: state.px[0], y: state.py[0], z: state.pz[0]} // fake vector for sharding
          , id, state
          );
        }
      }, 1000);
  };

}
());

