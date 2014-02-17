

(function() {

  var emptyAxes = [0, 0, 0, 0]
    , vTmp = new THREE.Vector3;

  GAME.setupHelicopter = function(body, mass, gravAmount, liftAmount, yawAmount, pitchAmount, rollAmount) {

    // littlebird empty weight = 722, max takeoff = 1.4
    GAME.setupAircraftInertia(body, mass);

    // Currently just ticking motion.
    this.tick = function(time, control) {
      var axes = control && control.axes || emptyAxes
        , rot = body.rotation

        , throttle = axes[0]
        , yaw = axes[1]
        , pitch = axes[2]
        , roll = axes[3];


      // Now lets generate some forces.
      // Motion is defined by two elements - gravity and lift.

      // Apply gravity.
      body.addVecForce(0, 0, -gravAmount, time);

      // Apply lift as per heli rotation.
      if (throttle < 0)
        throttle /= 2;

      vTmp.set(0, 0, gravAmount + liftAmount * throttle);
      vTmp.applyQuaternion(rot);
      body.addVecForce(vTmp.x, vTmp.y, vTmp.z, time);


      // Rotation.

      // Yaw.
      vTmp.set(0, 1, 0);
      vTmp.applyQuaternion(rot);
      body.addRotForce(vTmp.x, vTmp.y, vTmp.z, yaw * yawAmount, time);

      // Pitch.
      vTmp.set(1, 0, 0);
      vTmp.applyQuaternion(rot);
      body.addRotForce(vTmp.x, vTmp.y, vTmp.z, pitch * pitchAmount, time);

      // Roll.
      vTmp.set(0, 0, 1);
      vTmp.applyQuaternion(rot);
      body.addRotForce(vTmp.x, vTmp.y, vTmp.z, roll * rollAmount, time);


      // Air resistance.

      body.addAirResist(1, time);


      // Interpolate!

      body.applyVec(body.position, time);
      body.applyRot(body.quaternion, time);

    };
  };

  GAME.setupLittlebird = function(body) {

    GAME.setupHelicopter(

      // mass
      body

      // mass, grav, lift per sec
    , 1
    , 9.78
    , 10.5

      // yaw, pitch, roll per sec
    , Math.PI
    , Math.PI / 2
    , Math.PI / 2

    );

  };

}
());

