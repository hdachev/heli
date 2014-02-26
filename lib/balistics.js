

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

    , vTmp = new THREE.Vector3;

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

  function fireBullet(bullet, pos, vec, quat, speed, range) {
    bullet.position.copy(pos);
    bullet.quaternion.copy(quat);

    // +/- 5% bullet speed
    // speed = (Math.random() + 9.5) / 10 * speed;
    vTmp.set(0, 0, (Math.random() + 9.5) / 10 * -speed);
    vTmp.applyQuaternion(quat);

    // vehicle velocity
    vTmp.add(vec);

    bullet.$b_sx = vTmp.x;
    bullet.$b_sy = vTmp.y;
    bullet.$b_sz = vTmp.z;
    bullet.$b_s = speed;
    bullet.$b_r = range;

    GAME.scene.add(bullet);
  }

  GAME.fireBullet = function(vec, quat, speed, range) {
    var bullet;

    // keep track of all shots fired,
    // also use the registry as an object pool
    bullets[numBullets] = bullet =
      bullets[numBullets] || makeBullet();

    numBullets++;

    // fire it
    fireBullet(
      bullet
    , vec, quat, speed, range
    );
  };


  // Balistics tick.

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

