

// about missiles -

// players fire them only after they lock -
// when fired, they just fly forward until
// the player that's being locked on takes control.

// missiles are assumed to travel at a constant speed,
// and the only thing that needs communicating is
// their current position and their coords of impact.
// every time the coords of impact change,
// a new current position is also communicated.


(function() {

  var vTmp = new THREE.Vector3
    , vTmpA = new THREE.Vector3
    , vTmpB = new THREE.Vector3

    , interRes = GAME.INTER_RES

    , material = new THREE.MeshBasicMaterial({ color: 0xffffff });


  //

  function updateCourse(course, missile, target) {

    // determine current movement vector
    // IMPORTANT this should be done before we start fooling around with course data
    GAME.predictCourse(missile, 0.1, vTmpA);
    vTmp.copy(missile.position);
    vTmpA.sub(vTmp);

    // make sure we don't leave extra vector entries.
    if (course.px.length > 3) {
      course.px.length = 3;
      course.py.length = 3;
      course.pz.length = 3;
    }

    course.px[0] = vTmp.x;
    course.py[0] = vTmp.y;
    course.pz[0] = vTmp.z;

    // we'll do a 10 step simulation
    var endSpeed = (course.speed || 10) / 10
      , speed = vTmpA.length()

        // turn rate
      , t1 = Math.max(Math.min(course.turn, 0.25), 0.025) || 0.1
      , t0 = 1 - t1

      , i, j
      , time = 0;

    for (i = 1; i < 3; i ++) {
      for (j = 0; j < 5; j ++) {

        // adjust speed as we go
        speed = speed * 0.9 + endSpeed * 0.1;

        // compute expected target location
        time += 0.1;
        GAME.predictCourse(target, time, vTmpB);

        // subtract current missile position, normalize
        // and multiplying by speed -> this is our desired movement vector
        vTmpB.sub(vTmp);
        vTmpB.normalize();
        vTmpB.multiplyScalar(speed);

        vTmpA.x = vTmpA.x * t0 + vTmpB.x * t1;
        vTmpA.y = vTmpA.y * t0 + vTmpB.y * t1;
        vTmpA.z = vTmpA.z * t0 + vTmpB.z * t1;

        // apply this movement
        vTmp.add(vTmpA);
      }

      course.px[i] = vTmp.x;
      course.py[i] = vTmp.y;
      course.pz[i] = vTmp.z;
    }

    return course;
  }


  //

  function guideMissile(id, data, total, delta) {
    if (total < 0.1)
      return;

    var missile = this
      , pos = missile.position

      , target = missile.$m_targ
      , tpos = target.position

      , explode = false;

    // collide with terrain and range exceeded
    if (pos.y <= GAME.plotHeight(pos.x, pos.z) || (data.range = Math.round(data.range - data.speed * delta)) < 0)
      explode = true;

    // check if blast conditions are met
    else
      explode = (pos.distanceTo(tpos) - data.blast) < Math.random() * data.blast * (data.falloff || 2);

    // publish course with explosion data.
    // at this point we'll stop receiving guidance updates.
    if (explode)
      GAME.explodeTracker(id);

    // recalc/republish course every 500ms
    // update control if we're the owner of this target id
    // perhaps the best way to do this is to plot the missile's course -
    else if (total > 0.250)
      GAME.sendTrackerUpdate(missile.uuid, updateCourse(data, missile, target));
  }


  // missile model,
  // should spawn the missile swarm and prep it for animation

  function makeMissile() {
    var missile =  new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2)
    , material
    );

    missile.position.set(
      Math.random() - 0.5
    , Math.random() - 0.5
    , Math.random() - 0.5
    );

    return missile;
  }

  function makeMissileSwarm(data) {
    var model = new THREE.Object3D()
      , i, n = Math.max(1, data.count || 0);

    for (i = 0; i < n; i ++)
      model.add(makeMissile(data));

    return model;
  }


  // handling remote missile updates -
  // uses the tracker stack

  GAME.updateHandlers.m = function(id, data) {
    var missile = GAME.upsertTracker(id, data, makeMissileSwarm);

    // activate local missile control for remote missiles
    // that are tracking locally controlled objects.
    if (missile && GAME.isLocallyOwned(data.targ)) {
      missile.$m_targ = GAME.lookup(data.targ);
      missile.onTrackerUpdate = guideMissile;
    }
  };


  // missile data and launcher vec/quat
  // this should seed the initial course and publish over network

  GAME.spawnMissile = function(pos, vec, quat, target, data) {

    // add half the missile speed rotated forward
    // to the vehicle's current inertia vector.
    vTmp.set(0, 0, - data.speed / interRes);
    vTmp.applyQuaternion(quat);

    //
    vTmp.x += pos.x + vec.x / interRes;
    vTmp.y += pos.y + vec.y / interRes;
    vTmp.z += pos.z + vec.z / interRes;

    // starting with linear forward flight
    // the tracked player will guide the missile
    data.px = [pos.x, vTmp.x];
    data.py = [pos.y, vTmp.y];
    data.pz = [pos.z, vTmp.z];

    // don't rotate before remote lock
    data.qx = [quat.x];
    data.qy = [quat.y];
    data.qz = [quat.z];
    data.qw = [quat.w];

    // markers
    data.t = 'm';
    data.targ = target.uuid;

    // send over network
    GAME.sendTrackerUpdate(GAME.nextId('m'), data);
  };

}
());

