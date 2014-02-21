

// Heads up display.

(function() {
  /*global document:false*/
  /*jshint onevar:false*/

  function makeDiv(className) {
    var div = document.createElement("div");
    div.className = className;
    document.body.appendChild(div);
    return div;
  }

  function makeHudbox(className, suffix) {
    var div = makeDiv("hudbox " + className)
      , curr;

    return function(str) {
      if (str !== curr) {
        curr = str;
        if (suffix)
          str += suffix;
        div.innerText = str;
      }
    };
  }


  // We'll use the reticle as a z-order separator
  // between trackers and the rest of the hud.

  var reticle = makeDiv("reticle");


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


  // Targeting.

  var target;

  GAME.getTarget = function() {
    return target;
  };

  GAME.setTarget = function(targ) {
    if (targ === target)
      return;

    target = targ;
    if (GAME.onSetTarget)
      GAME.onSetTarget(target);
  };

  GAME.setTargetUnderReticle = function() {
    var best, bestDist = 1;

    GAME.foreachTracker(function(tracker) {
      if (tracker.offscreen)
        return;

      var d = tracker.x * tracker.x + tracker.y * tracker.y;
      if (d < bestDist) {
        bestDist = d;
        best = tracker;
      }
    });

    GAME.setTarget(best);
  };


  // Trackers.

  var updateTrackers;

  (function() {

    GAME.onAddUnit = function(tracker) {
      if (!tracker.div)
        tracker.div = makeDiv("tracker");

      document.body.insertBefore(tracker.div, reticle);
    };

    GAME.onRemoveUnit = function(tracker) {
      document.body.removeChild(tracker.div);
    };

    updateTrackers = function() {

      // object tracker
      GAME.foreachTracker(function(tracker) {
        var prj = GAME.worldToScreen(tracker.position)
          , x = prj.x
          , y = prj.y
          , z = prj.z
          , d
          , offscreen = z >= 1 || x < -0.95 || y < -0.95 || x > 0.95 || y > 0.95

          , div = tracker.div
          , transform;

        if (offscreen) {

          if (!tracker.offscreen) {
            tracker.offscreen = true;
            div.classList.remove("onscreen");
          }

          // arrange markers for offscreen objects in a circle around the hud
          d = Math.sqrt(x * x + y * y) * 1.1;
          x /= d;
          y /= d;

          // flip if behind the z plane
          if (z >= 1) {
            x *= -1;
            y *= -1;
          }
        }

        else if (tracker.offscreen) {
          tracker.offscreen = false;
          div.classList.add("onscreen");
        }

        // keep track of tracker position
        tracker.x = x;
        tracker.y = y;
        tracker.z = z;

        // target marker
        if (target === tracker) {

          if (!tracker.isTarget) {
            tracker.isTarget = true;
            div.classList.add("target");
          }
        }
        else if (tracker.isTarget) {
          tracker.isTarget = false;
          div.classList.remove("target");
        }

        // transform the hud element
        if (offscreen) {

          // we want these to form a circle, not an elipse, so let's give them some extra love

          d = Math.min(GAME.screenW, GAME.screenH);
          x = (x * d + GAME.screenW) / 2;
          y = (GAME.screenH - y * d) / 2;
        }
        else {
          x = GAME.screenW * (x / 2 + 0.5);
          y = GAME.screenH * (0.5 - y / 2);
        }

        transform = "translate3d(" + Math.round(x) + "px, " + Math.round(y) + "px, 0px) rotateZ(45deg)";
        div.style.webkitTransform = transform;

      });
    };

  }
  ());


  // Hud.

  var alt = makeHudbox("altitude", " m")
    , spd = makeHudbox("grdspeed", " kmh")
    , mod = makeHudbox("engine")
    , brn = makeHudbox("burner red");

  GAME.redrawHud = function() {
    var cam = GAME.camera;
    if (!cam.getGroundspeed)
      return;

    spd(Math.round(cam.getGroundspeed() * 3600 / 1000));
    var a = cam.position.y - GAME.plotHeight(cam.position.x, cam.position.z);

    // HACK!
    /*global location:false*/
    if (a < 1)
      location.reload();

    alt(Math.round(a));
    mod(cam.engine);
    brn(cam.burner);

    updateTrackers();
  };

}
());

