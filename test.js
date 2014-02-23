
(function()
{

  // Setup the camera as a helicopter.

  var littlebird = GAME.camera;

  GAME.setupLittlebird(littlebird);

  GAME.startRecording(littlebird);


  // Fire the minigun.

  var lastShot = 0;

  function fire() {
    var now = Date.now();

    // mock firing rate limit.
    // this obviously needs to evolve into a much more complex weapons control system
    if (now - lastShot < 50)
      return;

    lastShot = now;
    GAME.fireBullet(
      GAME.camera.position
    , GAME.camera.quaternion
    , 1050
    , 1050
    );
  }


  // Ticker.

  GAME.tick = function(time) {
    var pad;

    // pads


    // control
    littlebird.addGamepad(
      pad = GAME.getGamepad()
    , time
    );

    // redraw stuff
    GAME.redrawTerrain(
      littlebird.position.x
    , littlebird.position.z
    );

    GAME.redrawTrackers(time);
    GAME.redrawHud();

    // trigger
    if (pad && pad.buttons[7] > 0.5)
      fire();

    // targeting
    if (pad && pad.buttons[4] > 0.5)
      GAME.setTargetUnderReticle();

    // bullets
    GAME.updateBullets(time);
  };


  // Start at X meters above ground.

  littlebird.position.y = GAME.plotHeight(littlebird.position.x, littlebird.position.z) + 2;

}
());


GAME.replayRecording();

// found better looking coords

GAME.camera.position.set(
  -821.8047060078767, 668.1117043130289, 11376.514316484781
);



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

