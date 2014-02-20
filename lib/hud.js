

// Heads up display.

(function() {
  /*global document:false*/

  function makeDiv(className) {
    var div = document.createElement("div");
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

  function makeTarget() {
    return makeDiv("target");
  }

  makeReticle();

  var alt = makeHudbox("altitude")
    , spd = makeHudbox("airspeed")
    , mod = makeHudbox("engine")
    , brn = makeHudbox("burner red")

    , targ = makeTarget()
    , hasTarg = false;

  GAME.redrawHud = function() {
    var cam = GAME.camera;
    if (!cam.getGroundspeed)
      return;

    spd(Math.round(cam.getGroundspeed() * 3600 / 1000) + " kmh");
    var a = cam.position.y - GAME.plotHeight(cam.position.x, cam.position.z);
    if (a < 1)
      location.reload();

    alt(Math.round(a) + " m");
    mod(cam.engine);
    brn(cam.burner);

    // Target tracker.
    GAME.foreachTracker(function(tracker) {
      var prj = GAME.worldToScreen(tracker.position)
        , x, y, transform;

      // off screen
      if (prj.z >= 0)
        return;

      x = (prj.x + 1) / 2;
      y = (1 - prj.y) / 2;

      //
      if (x < 0 || y < 0 || x > 1 || y > 1)
        return;

      transform = "translate3d(" + Math.round(GAME.screenW * x) + "px, " + Math.round(GAME.screenH * y) + "px, 0px) rotateZ(45deg)";
      targ.style.webkitTransform = transform;
    });
  };

}
());

