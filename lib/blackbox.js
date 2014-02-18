

// this is a flight recorder that i'm planning to use
// in my attempts to build up the multiplayer tooling.

(function() {
  /*global localStorage:false*/

  var history = [];

  //
  function describe(flyer) {

    // project the following 3 seconds
    // of movement among the current vector
    var projection = flyer.extrapolateMovement(2);
    projection._id = 'memo';
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
      , data, i = 0;

    try {
      data = JSON.parse(rec);
    } catch(e) {}

    // start replaying.
    if (data)
      setInterval(function() {
        var entry = data[i++];
        if (entry)
          GAME.updateTracker(entry, Date.now() / 1000);

      }, 1000);

  };

}
());

