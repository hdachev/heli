

// trying to nail the engine for ballistic weapondry

(function() {


  // startpos, rot, speed
  // the pos and rot can come directly from the source vehicle/turrent's object,
  // which should cut down on allocations.

  var bullets = [], numBullets = 0
    , material = new THREE.MeshBasicMaterial({ color: 0xff6633 })

    , vTmp = new THREE.Vector3;

  // bullets appear as several meter-long traces
  function makeBullet() {
    var geometry, mesh;

    GAME.log("new-mesh");

    // modelling the bullet as a 100 meter long triangle, that's 1m wide at its head.
    geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(0, 0, 0));   // Vector3 used to specify position
    geometry.vertices.push(new THREE.Vector3(-0.5, 0, -100));
    geometry.vertices.push(new THREE.Vector3( 0.5, 0, -100));   // 2d = all vertices in the same plane.. z = 0

    geometry.faces.push(new THREE.Face3(0, 2, 1));

    mesh = new THREE.Mesh(geometry, material);
    mesh.doubleSided = true;
    return mesh;
  }

  function fireBullet(bullet, vec, quat, speed, range) {
    bullet.position.copy(vec);
    bullet.quaternion.copy(quat);

    vTmp.set(0, 0, -speed);
    vTmp.applyQuaternion(quat);

    bullet.$_sx = vTmp.x;
    bullet.$_sy = vTmp.y;
    bullet.$_sz = vTmp.z;
    bullet.$_s = speed;
    bullet.$_r = range;

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


  GAME.updateBullets = function(time) {
    var i, bullet, pos
      , plot = GAME.plotHeight
      , drop;

    for (i = 0; i < numBullets; i ++) {
      bullet = bullets[i];
      pos = bullet.position;

      vTmp.x = pos.x + bullet.$_sx * time;
      vTmp.y = pos.y + bullet.$_sy * time;
      vTmp.z = pos.z + bullet.$_sz * time;

      drop = false;

      // TODO collision detection against vehicles
      // perhaps ballistic weapons should deal half their damage on each client

      // enforce range
      if ((bullet.$_r -= bullet.$_s * time) < 0)
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
  };

}
());

