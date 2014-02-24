

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
    , qTmp = new THREE.Quaternion;


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

    // extrapolate rotation past the last projection
    while (course.qx.length <= next) {

      // allow for no rotation
      if (course.qx.length < 2) {
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

    tracker.$t_xpl = false;

    // add to scene
    GAME.scene.add(tracker);

    // event hook
    if (GAME.onAddUnit)
      GAME.onAddUnit(tracker);

    return tracker;
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

    // or update
    else if (tracker.$t_rev !== data.rev) {
      if (data.t === 'm')
        GAME.log("M>", data.rev);

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

  GAME.explodeTracker = function(id, data) {
    var tracker = trackers[id]
      , pos = tracker.position
      , quat = tracker.quaternion;

    // calc explosion course
    // i'll probably need to collide this with the earth,
    // perhaps i could even do a simple physics calculation here
    data.explode = true;
    applyCourse(tracker, data, tracker.$t_tim + 0.5, vTmp, qTmp);

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

  // enter frame
  GAME.redrawTrackers = function(time) {

    // here we go
    var id, tracker, total, data;
    for (id in trackers) {
      tracker = trackers[id];

      // d/t
      data = tracker.$t_dat;
      total = (tracker.$t_tim += time);

      // drop trackers when left idle for a couple of seconds
      if (total > 5) {
        delete trackers[id];
        GAME.scene.remove(tracker);

        // event hook
        if (GAME.onRemoveUnit)
          GAME.onRemoveUnit(tracker);
      }

      // else advance
      else {
        applyCourse(
          tracker, data, total
        , tracker.position, tracker.quaternion
        );

        // centralized explosion control,
        // the animation and stuff should work via particle systems
        if (data.explode || tracker.$t_xpl) {
          if (!tracker.$t_xpl) {
            tracker.$t_xpl = true;
            handleExplosion(tracker, data);
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
  };

  //
  GAME.foreachTracker = function(f) {
    var id;
    for (id in trackers)
      f(trackers[id]);
  };

  // tmp
  GAME.lookup = function(id) {
    return trackers[id];
  };


}
());


