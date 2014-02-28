

(function() {

  // spawn in nosedive on top of my favourite coords,
  // start at 3 kilometers

  var littlebird = GAME.createTracker({
    t: 'v'
  , m: 'bubl'
  , px: [-821.8047060078767]
  , py: [600]
  , pz: [11376.514316484781]
  , qx: [0]
  , qy: [0]
  , qz: [0]
  , qw: [1]
  });

  // put the player in the pilot seat
  GAME.setPlayerAvatar(littlebird);

  // and accelerate the thing downward
  // littlebird.addVecForce(0, 0, 100, 1);

  // start blackbox
  GAME.startRecording(littlebird);
  GAME.replayRecording();



  /* Fire the minigun.

  var lastMissile = 0
    , vTmp = new THREE.Vector3;

  function fireMissile() {
    var now = Date.now()
      , targ = GAME.getTarget();

    if (now - lastMissile < 250)
      return;
    if (!targ)
      return;

    GAME.camera.putVec(vTmp);

    lastMissile = now;
    GAME.spawnMissile(
      GAME.camera.position
    , vTmp
    , GAME.camera.quaternion
    , targ
    , { speed: 220
      , range: 5050
      , turn: 0.1
      , blast: 30
      , falloff: 2
      , dmg: 100
      , count: 3
      }
    );
  }


  // We've isolated movement controls,
  // now its time to isolate weapon systems too.

  GAME.subscribe(GAME.DRAW_FRAME, function(time) {
    var pad = GAME.getGamepad();

    // fire controls
    // moving those to the heli vehicle

    if (pad) {

      // missile rack
      if (pad.buttons[6] > 0.5)
        fireMissile();

      // targeting
      if (pad.buttons[4] > 0.5)
        GAME.setTargetUnderReticle();
    }
  });

  */

}
());

