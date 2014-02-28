

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
      var args = Array.prototype.slice.call(arguments)
        , i, n = args.length;

      for (i = 0; i < n; i ++)
        if (typeof args[i] === 'object') {

          // quat
          if (args[i].w)
            args[i] = 'Q[w:' + args[i].w + ', x:' + args[i].x +', y:' + args[i].y +', z:' + args[i].z + ']';

          // vec
          if (args[i].z)
            args[i] = 'V[x:' + args[i].x +', y:' + args[i].y +', z:' + args[i].z + ']';
        }

      log.push(args.join(" "));
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
  };

  GAME.setTargetUnderReticle = function() {
    var best, bestDist = 1;

    GAME.foreachTrackerOfType('v', function(tracker) {
      if (tracker.offscreen || !tracker.visible)
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

  GAME.subscribe(GAME.TRACKER_ADDED, function(tracker) {
    if (!tracker.div)
      tracker.div = makeDiv("tracker");

    document.body.insertBefore(tracker.div, reticle);
  });

  GAME.subscribe(GAME.TRACKER_REMOVED, function(tracker) {
    document.body.removeChild(tracker.div);
  });

  function updateTrackers() {

    // object tracker
    GAME.foreachTrackerOfType('v', function(tracker) {
      if (!tracker.visible)
        return;

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
  }


  // Hud.

  var alt = makeHudbox("altitude", " m")
    , spd = makeHudbox("groundspeed", " kmh")
    , mod = makeHudbox("engine")
    , brn = makeHudbox("burner red")

    , LOCK_TRIGGER = 4;

  GAME.subscribe(GAME.DRAW_FRAME, function() {
    var avatar = GAME.getPlayerAvatar()
      , gamepad = GAME.getGamepad();

    if (!avatar)
      return;

    // Select target.
    // Missile lock should be automatic,
    // based on the target tracker position's wrt the player's screen.
    if (gamepad.buttons[LOCK_TRIGGER] > 0.5)
      GAME.setTargetUnderReticle();

    //
    spd(Math.round(avatar.getGroundspeed() * 3600 / 1000));
    var a = avatar.position.y - GAME.plotHeight(avatar.position.x, avatar.position.z);

    // HACK!
    /*global location:false*/
    if (a < 1)
      location.reload();

    alt(Math.round(a));
    mod(avatar.engine);
    brn(avatar.burner);

    updateTrackers();
  });

}
());

