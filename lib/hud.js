

// Heads up display.

(function() {
  /*global document:false*/

  function makeDiv(className) {
    div = document.createElement("div");
    div.className = className;
    document.body.appendChild(div);
    return div;
  }

  function makeHudbox(className) {
    var div = makeDiv("hudbox " + className)
      , curr;

    return function(str) {
      if (str !== curr) {
        curr = str;
        div.innerText = str;
      }
    };
  }


  // Logger.

  (function() {
    var logbox = makeHudbox("logbox")
      , log = [];

    GAME.log = function() {
      log.push(Array.prototype.slice.call(arguments).join(" "));
      if (log.length > 10)
        log.shift();

      logbox(log.join("\n"));
    };
  }
  ());


  // Hud.

  function makeReticle() {
    return makeDiv("reticle");
  }

  var alt = makeHudbox("altitude")
    , spd = makeHudbox("airspeed")
    , ret = makeReticle();

  GAME.redrawHud = function() {
    var cam = GAME.camera;
    if (!cam.getGroundspeed)
      return;

    spd(Math.round(cam.getGroundspeed() * 3600 / 1000) + " kmh");
    alt(Math.round(cam.position.y - GAME.plotHeight(cam.position.x, cam.position.z)) + " m");
  };
}
());

