

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

      // need smth shiny
    , material = new THREE.MeshBasicMaterial({ color: 0xffffff })

      // missile weapons are mapped to L2
    , TRIGGER = 6
    , weapons = {};


  //

  function updateCourse(course, missile, spec, target) {

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
    var endSpeed = (spec.speed || 200) / 10
      , speed = vTmpA.length()

        // turn rate
      , t1 = Math.max(Math.min(spec.turn || 0, 0.25), 0.025) || 0.1
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

  function guideMissile(id, data, tracker, total, delta) {
    if (total < 0.1)
      return;

    var missile = this
      , spec = weapons[data.m]
      , pos = missile.position
      , target = missile.$m_targ
      , tpos = target.position

      , explode = false;

    if (!spec)
      return;

    // collide with terrain and range exceeded
    if (pos.y <= GAME.plotHeight(pos.x, pos.z) || (tracker.$m_rng = Math.round((tracker.$m_rng || spec.range || 1000) - (spec.speed || 200) * delta)) < 0)
      explode = true;

    // check if blast conditions are met
    else
      explode = (pos.distanceTo(tpos) - (spec.blast || 10)) < Math.random() * (spec.blast || 10) * (spec.falloff || 2);

    // publish course with explosion data.
    // at this point we'll stop receiving guidance updates.
    if (explode)
      GAME.explodeTracker(id);

    // recalc/republish course every now and then.
    else if (total > 0.4)
      GAME.sendTrackerUpdate(missile.uuid, updateCourse(data, missile, spec, target));
  }


  // missile model,
  // should spawn the missile swarm and prep it for animation

  function makeMissile() {
    var missile =  new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2)
    , material
    );

    // TODO take missile spec into consideration
    missile.position.set(
      Math.random() - 0.5
    , Math.random() - 0.5
    , Math.random() - 0.5
    );

    return missile;
  }

  function makeMissileSwarm(data) {

    // TODO reuse models
    var model = new THREE.Object3D()
      , i, n = data.swarm || 1;

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

  GAME.spawnMissile = function(source, spec, target) {
    var pos = source.position
      , quat = source.quaternion
      , data = { m: spec.name };

    // add half the missile speed rotated forward
    // to the vehicle's current inertia vector.
    vTmp.set(0, 0, - spec.speed / interRes);
    vTmp.applyQuaternion(quat);

    // apply launcher speed to init missile speed
    GAME.applyTrackerVec(source, vTmp);

    // starting with linear forward flight
    // the tracked player will guide the missile
    data.px = [pos.x, pos.x + vTmp.x / interRes];
    data.py = [pos.y, pos.y + vTmp.y / interRes];
    data.pz = [pos.z, pos.z + vTmp.z / interRes];

    // don't rotate before remote lock
    data.qx = [quat.x];
    data.qy = [quat.y];
    data.qz = [quat.z];
    data.qw = [quat.w];

    // markers
    data.t = 'm';
    data.targ = target.uuid || target;

    // send over network
    GAME.sendTrackerUpdate(GAME.nextId('m'), data);
  };


  //

  GAME.defineMissileSystem = function(name, spec) {

    // spec
    spec.name = name;
    weapons[name] = spec;

    //
    GAME.equipment[name] = {

      // Loadout slot.
      slot: TRIGGER

      // Firing system.
    , applyControl: function(avatar, gamepad, time) {
        var fire = gamepad.buttons[TRIGGER] > 0.5
          , lock = GAME.getMissileLock(avatar)
          , cool = avatar.$m_cool || 0;

        // in order to fire you need:
        // a] a lock-on on an enemy,
        // b] the launcher to have cooled down,
        // c] to push the trigger
        if (lock && fire && cool <= 0) {

          // flag launcher for cooldown, default is 1 sec
          avatar.$m_cool = spec.cool || 1;

          // spawn a missile
          GAME.spawnMissile(avatar, spec, lock);
        }

        // cooldown
        else if (cool > 0)
          avatar.$m_cool = cool - time;
      }
    };

  };


  // Missile lock storage api.

  GAME.setMissileLock = function(avatar, target) {
    // avatar.$m_lock = target ? target.uuid || target : null;

    throw "not needed yet" + target;
  };

  GAME.getMissileLock = function(avatar) {
    // var lock = avatar.$m_lock;
    // return lock && trackers.lookup(lock);

    // temp, the avatar var is misused just to make the linter shut up.
    // we're not talking about an avatar here
    avatar = GAME.getTarget();
    if (avatar)
      return avatar.uuid;
  };


/*
  Need to bring over the missile systems from mech warrior
  as an air-to-ground missile type of some sort,
  together with anti-missile-systems on ground units

  air units will need to outrun/outmanoever incoming missiles
*/

  GAME.defineMissileSystem('lrm3', {

    // slow, long range, big blast
    speed: 220
  , range: 10100
  , turn: 0.1
  , blast: 30
  , falloff: 2
  , dmg: 100

    // quick cooldown + small swarm,
    // so a controllable barrage is controllable
  , swarm: 3
  , size: 0.1
  , cool: 0.25

  });


/*
  AGM-114 Hellfire
  ----------------+
  Weight          | 100–108lb (45.4–49kg)[1]
  Length          | 64 in (163 cm)
  Diameter        | 7 in (17.8 cm)
  Warhead         | High Explosive Anti-Tank (HEAT); 20 lb (9 kg) tandem anti-armor
                  | Metal augmented charge (MAC); 18 lb (8 kg) shaped-charge
                  | Blast Fragmentation
  Engine          | Solid-fuel rocket
  Wingspan        | 13 in (33 cm)
  Op range        | 546 yd – 5 mi (500 m – 8 km)
  Speed           | Mach 1.3 (950 mph; 425 m/s; 1530 km/h)
  Guidance system | Semi-active laser homing
                  | millimeter wave radar seeker
*/

  GAME.defineMissileSystem('hell', {

    // trying to re-create the real thing here
    // faster, lower turn rate, smaller blast radius
    speed: 425
  , range: 8000
  , turn: 0.1
  , blast: 20
  , falloff: 2
  , dmg: 100

    // no swarm and stuff
  , size: 0.2
  , cool: 1

  });

}
());

