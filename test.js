
(function()
{

  // Setup the camera as a helicopter.

  var littlebird = GAME.camera;

  GAME.setupLittlebird(littlebird);


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
  };


  // Start at X meters above ground.

  littlebird.position.y = GAME.plotHeight(littlebird.position.x, littlebird.position.z) + 10;

}
());

