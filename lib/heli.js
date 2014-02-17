

(function() {
  "use strict";

  var emptyAxes = [0, 0, 0, 0]
    , vTmp = new THREE.Vector3;

  GAME.setupHelicopter = function(body, mass, gravAmount, liftAmount, yawAmount, pitchAmount, rollAmount) {

    // littlebird empty weight = 722, max takeoff = 1.4
    GAME.setupAircraftInertia(body, mass);

    function denoise(v) {
      return v * v * v;
    }

    // Currently just ticking motion.
    body.addGamepad = function(control, time) {
      var axes = control && control.axes || emptyAxes
        , rot = body.quaternion

          // inverted throttle axis
        , throttle = denoise(- axes[1])

          //
        , yaw = denoise(- axes[0])
        , pitch = denoise(axes[3])
        , roll = denoise(- axes[2]);


      // Air resistance.

      body.addAirResist(1, time);


      // Now lets generate some forces.
      // Motion is defined by two elements - gravity and lift.

      // Apply gravity.
      body.addVecForce(0, -gravAmount, 0, time);

      vTmp.set(0, gravAmount + liftAmount * throttle, 0);
      vTmp.applyQuaternion(rot);
      body.addVecForce(vTmp.x, vTmp.y, vTmp.z, time);


      // Rotation.

      // Yaw.
      vTmp.set(0, 1, 0);
      // vTmp.applyQuaternion(rot);
      body.addRotForce(vTmp.x, vTmp.y, vTmp.z, yaw * yawAmount, time);

      // Pitch.
      vTmp.set(1, 0, 0);
      // vTmp.applyQuaternion(rot);
      body.addRotForce(vTmp.x, vTmp.y, vTmp.z, pitch * pitchAmount, time);

      // Roll.
      vTmp.set(0, 0, 1);
      // vTmp.applyQuaternion(rot);
      body.addRotForce(vTmp.x, vTmp.y, vTmp.z, roll * rollAmount, time);


      // Interpolate!

      body.applyVec(body.position, time);
      body.applyRot(body.quaternion, time);
    };
  };

  GAME.setupLittlebird = function(body) {

    GAME.setupHelicopter(

      // mass
      body

      // mass, gravity
      // lift per sec
    , 1
    , 9.78 * 10
    , 10.5 * 2

      // yaw, pitch, roll per sec
    , Math.PI / 2
    , Math.PI / 2
    , Math.PI / 2

    );

  };

}
());

