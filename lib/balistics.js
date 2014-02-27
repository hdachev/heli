

// Trying to nail the engine for ballistic weapondry.
// Making this separate from the tracker stack because
// projectiles are usually numerous and very fast travelling.

(function() {


  // startpos, rot, speed
  // the pos and rot can come directly from the source vehicle/turrent's object,
  // which should cut down on allocations.

  var bullets = [], numBullets = 0

    , material = new THREE.MeshBasicMaterial({
        color: 0xff6633
      , side: THREE.DoubleSide
      })

    , vTmp = new THREE.Vector3

    , trackers = []
    , trackersFiringData = [];

  // bullets appear as several meter-long traces
  function makeBullet() {
    var geometry, mesh, rand = Math.random();

    // GAME.log("new bullet", numBullets);

    // modelling the bullet as a 100 meter long triangle, that's 1m wide at its head.
    geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(0, 0, 0));   // Vector3 used to specify position
    geometry.vertices.push(new THREE.Vector3(-0.5, rand - 0.5, (1 + Math.random()) * -50));
    geometry.vertices.push(new THREE.Vector3( 0.5, 0.5 - rand, (1 + Math.random()) * -50));   // 2d = all vertices in the same plane.. z = 0

    geometry.faces.push(new THREE.Face3(0, 2, 1));

    mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  function FRANGE(r, min, max) {
    r = Number(r) || 0;
    if (r < min) return min;
    if (r > max) return max;
    return r;
  }

  function fireBullet(source, data) {
    var bullet
      , speed = FRANGE(data.vel, 500, 2000)
      , range = speed * 2; // 2 second flight

    // keep track of all shots fired,
    // also use the registry as an object pool
    bullets[numBullets] = bullet =
      bullets[numBullets] || makeBullet();

    numBullets++;

    // remember where it came from
    // and keep track of the specs
    bullet.$b_src = source;
    bullet.$b_dat = data;

    // TODO modify the bullet model as per speed and caliber

    // place it
    bullet.position.copy(source.position);
    bullet.quaternion.copy(source.quaternion);

    // calc speed
    vTmp.set(0, 0, - speed);
    vTmp.applyQuaternion(source.quaternion);
    GAME.applyTrackerVec(source, vTmp);

    bullet.$b_sx = vTmp.x;
    bullet.$b_sy = vTmp.y;
    bullet.$b_sz = vTmp.z;
    bullet.$b_s = speed;
    bullet.$b_r = range; // 2 sec flight

    GAME.scene.add(bullet);
  }


  // Tracker start/stop firing.

  GAME.subscribe(GAME.TRACKER_UPDATE, function(id, data, tracker) {
    var x = trackers.indexOf(tracker)
      , firing = data.firing;

    // Sync the thing -
    if (firing) {
      x = trackers.indexOf(tracker);
      if (x < 0) {
        tracker.$b_fcool = 0.01; // -1 seconds, preset to a float
        trackers.push(tracker);
        trackersFiringData.push(firing);
      }
    }

    else if (x >= 0) {
      trackers.splice(x, 1);
      trackersFiringData.splice(x, 1);
    }
  });


  // Bullet spawn ticker.

  GAME.subscribe(GAME.SIM_FRAME, function(time) {
    var i, n = trackers.length
      , tracker, data, cool, rof;

    for (i = 0; i < n; i ++) {
      tracker = trackers[i];
      data = trackersFiringData[i];
      cool = tracker.$b_fcool - time;
      rof = Math.max(0.1, 1 / FRANGE(data.rof, 0.5, 60));

      // fire as soon as possible
      if (cool < 0) {
        cool += rof;
        fireBullet(
          tracker.position, tracker.quaternion
        , FRANGE(data.vel, 500, 1500)
        , tracker, data
        );
      }

      // update cooler
      tracker.$b_fcool = cool;
    }
  });


  // Projectile flight tick.

  GAME.subscribe(GAME.SIM_FRAME, function(time) {
    var i, bullet, pos
      , plot = GAME.plotHeight
      , drop;

    for (i = 0; i < numBullets; i ++) {
      bullet = bullets[i];
      pos = bullet.position;

      vTmp.x = pos.x + bullet.$b_sx * time;
      vTmp.y = pos.y + bullet.$b_sy * time;
      vTmp.z = pos.z + bullet.$b_sz * time;

      // rough gravity
      bullet.$b_sy -= 10 * time;

      drop = false;

      // enforce range
      if ((bullet.$b_r -= bullet.$b_s * time) < 0)
        drop = true;

      // collide with ground
      else if (plot(vTmp.x, vTmp.z) >= vTmp.y)
        drop = true;

      // drop bullet if over with
      if (drop) {
        numBullets --;
        GAME.scene.remove(bullet);

        // swap with last bullet and go back one step
        if (numBullets) {
          bullets[i--] = bullets[numBullets];
          bullets[numBullets] = bullet;
        }
      }

      // else advance it
      // TODO ballistic curve
      else
        bullet.position.copy(vTmp);
    }
  });

}
());

