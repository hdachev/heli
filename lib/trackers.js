

/* first attempt at keeping track of / rendering enemy units.

  {
    px, py, pz: [now, +1, +2, ...]
  , qx, qy, qz, qw: [now, +1, +2, ...]

  }

*/

(function() {

  var trackers = {}
    , interRes = GAME.INTER_RES

    , qTmpA = new THREE.Quaternion
    , qTmpB = new THREE.Quaternion
    , qTmpC = new THREE.Quaternion

    , vTmp = new THREE.Vector3
    , qTmp = new THREE.Quaternion

    , publish = GAME.publish
    , TRACKER_KILLED = GAME.TRACKER_KILLED
    , TRACKER_REMOVED = GAME.TRACKER_REMOVED
    , TRACKER_ADDED = GAME.TRACKER_ADDED;



  // debug

  function assertValidUpdate(data) {
    var key, value;
    for (key in data) {
      value = data[key];
      if (!value && value !== 0)
        throw "unexpected falsy in update data.";
      if (typeof value === 'object')
        assertValidUpdate(value);
    }
  }

  //
  function extrapolateRotation(course) {

    // add one rotation datapoint.
    var n = course.qx.length
      , n1 = n - 1
      , n2 = n - 2;

    qTmpA.set(course.qx[n2], course.qy[n2], course.qz[n2], course.qw[n2]);
    qTmpB.set(course.qx[n1], course.qy[n1], course.qz[n1], course.qw[n1]);

    // diff = rotation[n-1] - rotation[n-2]
    qTmpC.multiplyQuaternions(qTmpB, qTmpA.inverse());

    // out = rotation[n-1] + diff
    qTmpB.multiply(qTmpC);

    course.qx.push(qTmpB.x);
    course.qy.push(qTmpB.y);
    course.qz.push(qTmpB.z);
    course.qw.push(qTmpB.w);
  }

  // time here refers to total time traveled along this course
  function applyCourse(tracker, course, totalTime, outpos, outquat) {
    var spline
      , progress = totalTime * interRes
      , prev = Math.floor(progress)
      , t = progress - prev
      , next = prev + 1;

    // keep course state on the 3d model -
    // not that it's really needed, but the spline
    // doesn't need constant resets this way
    if (!(spline = tracker.$t_spln))
      tracker.$t_spln = spline = new GAME.Spline();

    if (spline.rev !== course.rev) {
      spline.rev = course.rev;
      spline.set(course.px, course.py, course.pz);
    }

    // interpolate motion,
    // the spline handles extrapolation
    spline.interpolate(progress, outpos);

    //
    if (!outquat)
      return;

    // extrapolate rotation past the last projection
    while (course.qx.length <= next) {

      // allow for no rotation
      if (course.qx.length < 2) {

        // no rotation data
        if (!course.qx.length)
          return;

        // static rotation
        outquat.set(course.qx[0], course.qy[0], course.qz[0], course.qw[0]);
        return;
      }

      extrapolateRotation(course);
    }

    // interpolate rotation
    qTmpA.set(course.qx[prev], course.qy[prev], course.qz[prev], course.qw[prev]);
    qTmpB.set(course.qx[next], course.qy[next], course.qz[next], course.qw[next]);
    THREE.Quaternion.slerp(qTmpA, qTmpB, outquat, t);
  }

  function makeTracker(id, data, makeModel) {
    if (!id)
      throw "null tracker id";

    var tracker = (makeModel || GAME.models[data.m])(data);
    tracker.uuid = id;

    tracker.$t_rev = data.rev;
    tracker.$t_dat = data;
    tracker.$t_tim = 0;

    tracker.isDebris = false;

    // add to scene
    GAME.scene.add(tracker);

    // event hook
    publish(TRACKER_ADDED, tracker);

    return tracker;
  }

  function redrawTracker(id, time) {
    var tracker = trackers[id]
      , total, data
      , x0, y0, z0
      , x1, y1, z1;

    // d/t
    data = tracker.$t_dat;
    total = (tracker.$t_tim += time);

    // drop trackers when left idle for a couple of seconds
    if (total > 5) {
      delete trackers[id];
      GAME.scene.remove(tracker);

      // event hook
      publish(TRACKER_REMOVED, tracker);
    }

    // else advance
    else {

      x0 = tracker.position.x;
      y0 = tracker.position.y;
      z0 = tracker.position.z;

      applyCourse(
        tracker, data, total
      , tracker.position, tracker.quaternion
      );

      x1 = tracker.position.x;
      y1 = tracker.position.y;
      z1 = tracker.position.z;

      // for the hud
      tracker.info_speed = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0) + (z1 - z0) * (z1 - z0)) / time;
      tracker.info_alti = y1 - GAME.plotHeight(x1, y1);

      // centralized explosion control,
      // the animation and stuff should work via particle systems
      if (data.explode || tracker.isDebris) {
        if (!tracker.isDebris) {
          tracker.isDebris = true;
          handleExplosion(tracker, data);

          publish(TRACKER_KILLED, tracker);
        }

        // allow model-mounted exposion animations
        if (tracker.redrawExplosion)
          tracker.redrawExplosion(tracker, data, time);

        // default explosion animation
        else if (GAME.redrawExplosion)
          GAME.redrawExplosion(tracker, data, time);
      }

      // custom control logic
      else if (tracker.onTrackerUpdate) {
        assertValidUpdate(data);
        tracker.onTrackerUpdate(id, data, total, time);
      }
    }
  }


  // remote updates

  GAME.upsertTracker = function(id, data, makeModel) {
    if (!data.rev)
      throw "no datarev";

    var tracker = trackers[id]
      , isNew = !tracker;

    // insert
    if (isNew)
      tracker = trackers[id] = makeTracker(id, data, makeModel);

    // update
    else if (tracker.$t_rev !== data.rev) {
      tracker.$t_rev = data.rev;
      tracker.$t_dat = data;
      tracker.$t_tim = 0;
    }

    // return, for example missile control
    // hooks onto the return value of this thing
    if (isNew)
      return tracker;
  };

  // vehicle update handler
  // TODO - this should go over to its own package,
  // since vehicles can also shoot and stuff, this only deals with movement.
  GAME.updateHandlers.v = GAME.upsertTracker;


  // emitting network updates.

  GAME.sendTrackerUpdate = function(id, data) {
    if (!id)
      throw "bad tracker id.";

    // DEBUG
    assertValidUpdate(data);

    //
    GAME.sendObjectUpdate(id, data);
  };

  GAME.createTracker = function(data) {
    if (!data.t)
      throw "bad tracker t";

    var id = GAME.nextId(data.t);
    GAME.sendTrackerUpdate(id, data);
    redrawTracker(id, 0);

    return trackers[id];
  };


  // explosion handling
  // this helps deal damage from both local and remote exposions

  function handleExplosion(tracker, data) {

    // deal splash damage
    GAME.forEachLocallyOwned(function(id) {
      var obj = GAME.lookup(id)
        , dist, falloff, damage;

      if (!obj.receiveDamage)
        return;

      dist = tracker.position.distanceTo(obj.position);
      falloff = data.falloff || 2;
      damage = data.dmg * (dist - data.blast) / data.blast * falloff;

      if (damage > 0)
        obj.receiveDamage(
          damage            // amount of damage
        , tracker.position  // direction
        , data.owner        // owner id
        );
    });
  }

  GAME.predictCourse = function(tracker, delta, outpos, outquat) {
    if (!tracker.uuid)
      tracker = trackers[tracker];

    var data = tracker.$t_dat
      , time = tracker.$t_tim + delta;

    applyCourse(tracker, data, time, outpos, outquat);
  };

  GAME.getTrackerData = function(tracker) {
    if (!tracker.uuid)
      tracker = trackers[tracker];

    return tracker.$t_dat;
  };

  GAME.explodeTracker = function(id) {
    var tracker = trackers[id]
      , data = tracker.$t_dat
      , pos = tracker.position
      , quat = tracker.quaternion;

    // calc explosion course
    // i'll probably need to collide this with the earth,
    // perhaps i could even do a simple physics calculation here
    data.explode = true;
    applyCourse(tracker, data, tracker.$t_tim + 0.5, vTmp, qTmp);

    // silly hook for player death
    if (data.isPlayerController)
      GAME.onPlayerKilled(tracker);

    // TODO fix these allocations
    data.px = [pos.x, vTmp.x];
    data.py = [pos.y, vTmp.y];
    data.pz = [pos.z, vTmp.z];

    data.qx = [quat.x, qTmp.x];
    data.qy = [quat.y, qTmp.y];
    data.qz = [quat.z, qTmp.z];
    data.qw = [quat.w, qTmp.w];

    //
    GAME.sendTrackerUpdate(id, data);
  };

  GAME.foreachTracker = function(f) {
    var id;
    for (id in trackers)
      f(trackers[id]);
  };

  GAME.foreachTrackerOfType = function(t, f) {
    var id, tracker;
    for (id in trackers) {
      tracker = trackers[id];
      if (tracker.$t_dat.t === t)
        f(tracker);
    }
  };

  GAME.lookup = function(id) {
    return trackers[id];
  };


  // Render loop.

  GAME.subscribe(GAME.DRAW_FRAME, function(time) {
    var id;
    for (id in trackers) {

      // interpolate visible trackers only.
      // currently the only non-visible one is the player-controlled vehicle
      if (trackers[id].visible)
        redrawTracker(id, time);
    }
  });

}
());


