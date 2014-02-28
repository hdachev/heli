

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
    , vTmp2 = new THREE.Vector3
    , qTmp = new THREE.Quaternion

    , inertMemo = {}

    , publish = GAME.publish
    , TRACKER_KILLED = GAME.TRACKER_KILLED
    , TRACKER_REMOVED = GAME.TRACKER_REMOVED
    , TRACKER_ADDED = GAME.TRACKER_ADDED
    , TRACKER_UPDATED = GAME.TRACKER_UPDATED;



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

  // projecting course for locally simulated trackers
  function projectCourse(tracker) {
    var result = tracker.$t_dat
      , control = tracker.$t_gmp
      , i, j;

    vTmp.copy(tracker.position);
    qTmp.copy(tracker.quaternion);
    tracker.saveInertia(inertMemo || (inertMemo = {}));

    if (result.px.length > 3) {
      result.px.length = 3;
      result.py.length = 3;
      result.pz.length = 3;
    }

    result.px[0] = vTmp.x;
    result.py[0] = vTmp.y;
    result.pz[0] = vTmp.z;

    if (result.qx.length > 3) {
      result.qx.length = 3;
      result.qy.length = 3;
      result.qz.length = 3;
      result.qw.length = 3;
    }

    result.qx[0] = qTmp.x;
    result.qy[0] = qTmp.y;
    result.qz[0] = qTmp.z;
    result.qw[0] = qTmp.w;

    for (i = 1; i < 3; i++) {

      // simulate the next second under the same control
      for (j = 0; j < 10 / interRes; j ++)
        tracker.simApply(vTmp, qTmp, control, 0.1);

      result.px[i] = vTmp.x;
      result.py[i] = vTmp.y;
      result.pz[i] = vTmp.z;

      result.qx[i] = qTmp.x;
      result.qy[i] = qTmp.y;
      result.qz[i] = qTmp.z;
      result.qw[i] = qTmp.w;
    }

    tracker.restoreInertia(inertMemo);
    return result;
  }

  GAME.applyTrackerControl = function(tracker, gamepad, time) {
    if (gamepad)
      tracker.$t_gmp = gamepad;

    tracker.simApply(tracker.position, tracker.quaternion, tracker.$t_gmp, time);
  };

  // time here refers to total time traveled along this course
  function applyCourse(tracker, delta, outpos, outquat) {
    var spline
      , course = tracker.$t_dat
      , progress = (tracker.$t_tim + delta) * interRes
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
    tracker.$t_tim = 0.0000001;

    tracker.$t_vx  = 0.0000001;
    tracker.$t_vy  = 0.0000001;
    tracker.$t_vz  = 0.0000001;

    tracker.isDebris = false;

    // add to scene
    GAME.scene.add(tracker);

    // event hook
    publish(TRACKER_ADDED, tracker);

    return tracker;
  }

  function updateTracker(id, time) {
    var tracker = trackers[id]
      , total, data
      , x0, y0, z0
      , x1, y1, z1;

    // timer
    data = tracker.$t_dat;
    total = (tracker.$t_tim += time);

    // special controls such as user gamepad
    // don't need interpolation and the like
    if ('simApply' in tracker) {

      // no more than 10 course updates per second
      if (total < 0.1)
        return;

      // the position and rotation thresholds should be determined by whether
      // there's another player nearby that's looking at this avatar
      if (total > 0.4 || !testIfCourseRelevant(tracker, 5, 0.1))
        GAME.sendTrackerUpdate(id, data);

      return;
    }

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
        tracker, 0 // delta already on $t_tim
      , tracker.position, tracker.quaternion
      );

      x1 = tracker.position.x;
      y1 = tracker.position.y;
      z1 = tracker.position.z;

      // velocity vector
      tracker.$t_vx = (x1 - x0) / time;
      tracker.$t_vy = (y1 - y0) / time;
      tracker.$t_vz = (z1 - z0) / time;

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
        tracker.onTrackerUpdate(id, data, tracker, total, time);
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

    // apply course and shit
    updateTracker(id, 0.001);

    // return, for example missile control
    // hooks onto the return value of this thing
    if (isNew)
      return tracker;
    else
      publish(TRACKER_UPDATED, id, data, tracker);
  };

  // vehicle update handler
  // TODO - this should go over to its own package,
  // since vehicles can also shoot and stuff, this only deals with movement.
  GAME.updateHandlers.v = GAME.upsertTracker;


  // local updates

  // updating the player vehicle's course
  // i need to balance a couple of things -
  // the simulation for the player must be a smooth as possible, so no interpolation and stuff there.
  // on the other hand, i don't want too many network updates, so that's something too.
  // my current take is to announce vehicle position/rotation once per frame,
  // and in case that's way off the current interpolation course plot and send a new course.

  // i'll be aiming at no more than 1 update per 100ms per second,
  // but even that's a shitload so most of the time i want less.

  function testIfCourseRelevant(tracker, dthresh, rthresh) {
    applyCourse(tracker, 0, vTmp, rthresh && qTmp);

    // test dtresh
    var d = vTmp.distanceTo(tracker.position);
    if (d > dthresh)
      return false;

    if (!rthresh)
      return true;

    vTmp.set(0, 0, 1);
    vTmp2.set(0, 0, 1);
    vTmp2.applyQuaternion(qTmp);

    d = Math.abs(Math.acos(vTmp.dot(vTmp2)));
    return d < rthresh;
  }

  GAME.sendTrackerUpdate = function(id, data) {
    if (!id)
      throw "bad tracker id.";
    if (!data)
      throw "falsy data.";

    // DEBUG
    assertValidUpdate(data);

    // update avatar course
    var tracker = trackers[id];
    if (tracker && 'simApply' in tracker)
      projectCourse(tracker);

    //
    GAME.sendObjectUpdate(id, data);
  };

  GAME.createTracker = function(data) {
    if (!data.t)
      throw "bad tracker t";

    var id = GAME.nextId(data.t);
    GAME.sendTrackerUpdate(id, data);

    return trackers[id];
  };


  // Helpers -
  // Modelling unit working data as a distributed key/value store.

  GAME.trackerSADD = function(tracker, key, item) {
    if (!tracker.uuid)
      tracker = trackers[tracker];

    var data = tracker.$t_dat
      , kset = data[key] || (data[key] = []);

    if (kset.indexOf(item) < 0) {
      kset.push(item);
      GAME.sendTrackerUpdate(tracker.uuid, data);
    }
  };

  GAME.trackerSREM = function(tracker, key, item) {
    if (!tracker.uuid)
      tracker = trackers[tracker];

    var data = tracker.$t_dat
      , kset = data[key]
      , x = kset ? kset.indexOf(item) : -1;

    if (x >= 0) {
      kset.splice(x, 1);
      if (!kset.length)
        delete data[key];

      GAME.sendTrackerUpdate(tracker.uuid, data);
    }
  };

  GAME.trackerSET = function(tracker, key, item) {
    if (!tracker.uuid)
      tracker = trackers[tracker];

    var data = tracker.$t_dat;
    if (data[key] !== item) {
      data[key] = item;
      GAME.sendTrackerUpdate(tracker.uuid, data);
    }
  };

  GAME.trackerDEL = function(tracker, key) {
    if (!tracker.uuid)
      tracker = trackers[tracker];

    var data = tracker.$t_dat;
    if (key in data) {
      delete data[key];
      GAME.sendTrackerUpdate(tracker.uuid, data);
    }
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

    applyCourse(tracker, delta, outpos, outquat);
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
    applyCourse(tracker, 1 / interRes, vTmp, qTmp);

    // TODO fix these allocations
    data.px = [pos.x, vTmp.x];
    data.py = [pos.y, vTmp.y];
    data.pz = [pos.z, vTmp.z];

    data.qx = [quat.x, qTmp.x];
    data.qy = [quat.y, qTmp.y];
    data.qz = [quat.z, qTmp.z];
    data.qw = [quat.w, qTmp.w];

    // explosion coords
    data.explode = true;
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

  GAME.applyTrackerVec = function(tracker, vec) {
    if (!tracker.uuid)
      tracker = trackers[tracker];

    // this needs to go,
    // we should just use t_qx and shit properties
    // in order to store phyiscs data on trackers and we'll be good
    if ('simApply' in tracker) {
      tracker.putVec(vTmp);
      vec.x += vTmp.x;
      vec.y += vTmp.y;
      vec.z += vTmp.z;
    }

    else {
      vec.x += tracker.$t_vx;
      vec.y += tracker.$t_vy;
      vec.z += tracker.$t_vz;
    }
  };


  // Render loop.

  GAME.subscribe(GAME.DRAW_FRAME, function(time) {
    var id;
    for (id in trackers)
      updateTracker(id, time);
  });

}
());


