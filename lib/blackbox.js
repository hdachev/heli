

// this is a flight recorder that i'm planning to use
// in my attempts to build up the multiplayer tooling.

(function() {
  /*global localStorage:false*/

  var history = []
    , id = "z" + Math.round(Math.random() * 0xffff).toString(16);

  //
  function describe(flyer) {

    // project the following 3 seconds
    // of movement among the current vector
    var course = flyer.projectCourse();
    return course;
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
          state.t = 'v'; // vehicle
          state.m = 'bubble'; // bubbleship

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

