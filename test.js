
(function()
{

  // Setup the camera as a helicopter.

  var littlebird = GAME.camera;

  GAME.setupLittlebird(littlebird);

  GAME.startRecording(littlebird);


  // Ticker.

  var last = Date.now();

  GAME.tick = function(time) {

    // control
    littlebird.addGamepad(
      GAME.pads[0]
    , time
    );

    // redraw the terrain around the player
    GAME.redrawTerrain(
      littlebird.position.x
    , littlebird.position.z
    );

    // redraw entity trackers
    GAME.redrawTrackers(time);
  };


  // Start at X meters above ground.

  littlebird.position.y = GAME.plotHeight(littlebird.position.x, littlebird.position.z) + 10;

}
());


GAME.replayRecording();


/* fake tracker

setInterval(
  function() {

    GAME.updateTracker({

      id: "hello"

    , px: [0]
    , py: [GAME.plotHeight(0, 0)]
    , pz: [-50]

    , qx: [0], qy: [0], qz: [0], qw: [1]

    });

  }
, 1000
);

// */

