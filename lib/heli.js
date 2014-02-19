

(function() {
  "use strict";

  var emptyAxes = [0, 0, 0, 0]
    , vTmp = new THREE.Vector3

    , vPrj = new THREE.Vector3
    , qPrj = new THREE.Quaternion;

  GAME.setupHelicopter = function(body, mass, gravAmount, liftAmount, yawAmount, pitchAmount, rollAmount) {

    // littlebird empty weight = 722, max takeoff = 1.4
    GAME.setupAircraftInertia(body, mass);

    function denoise(v) {
      return v * v * v;
    }

    function advance(vec, rot, control, time) {

      // Control.
      var axes = control && control.axes || emptyAxes
        , throttle = denoise(- axes[1])
        , yaw = denoise(- axes[0])
        , pitch = denoise(axes[3])
        , roll = denoise(- axes[2]);

      // Air resistance.
      body.addAirResist(1, time);

      // Apply gravity.
      body.addVecForce(0, -gravAmount, 0, time);

      // Aplly lift.
      vTmp.set(0, gravAmount + liftAmount * throttle, 0);
      vTmp.applyQuaternion(rot);
      body.addVecForce(vTmp.x, vTmp.y, vTmp.z, time);

      // Yaw.
      vTmp.set(0, 1, 0);
      body.addRotForce(vTmp.x, vTmp.y, vTmp.z, yaw * yawAmount, time);

      // Pitch.
      vTmp.set(1, 0, 0);
      body.addRotForce(vTmp.x, vTmp.y, vTmp.z, pitch * pitchAmount, time);

      // Roll.
      vTmp.set(0, 0, 1);
      body.addRotForce(vTmp.x, vTmp.y, vTmp.z, roll * rollAmount, time);

      // Done!
      body.applyVec(vec, time);
      body.applyRot(rot, time);
    }

    // Projector state.
    var lastControl
      , inertMemo;

    // Movement.
    body.addGamepad = function(control, time) {
      lastControl = control;

      advance(
        body.position
      , body.quaternion
      , control, time
      );
    };

    // Projecting.
    // Simulates the next 2 250ms intervals 50ms increments,
    // and then restores everything to how it was.
    body.extrapolateMovement = function(result) {

      vPrj.copy(body.position);
      qPrj.copy(body.quaternion);
      body.saveInertia(inertMemo || (inertMemo = {}));

      var i, j;

      if (!result)
        result = {
          px: [], py: [], pz: []
        , qx: [], qy: [], qz: [], qw: []
        };

      result.px[0] = vPrj.x;
      result.py[0] = vPrj.y;
      result.pz[0] = vPrj.z;
      result.qx[0] = qPrj.x;
      result.qy[0] = qPrj.y;
      result.qz[0] = qPrj.z;
      result.qw[0] = qPrj.w;

      for (i = 1; i < 3; i++) {

        // simulate the next second under the same control
        for (j = 0; j < 5; j ++)
          advance(vPrj, qPrj, lastControl, 0.1);

        result.px[i] = vPrj.x;
        result.py[i] = vPrj.y;
        result.pz[i] = vPrj.z;
        result.qx[i] = qPrj.x;
        result.qy[i] = qPrj.y;
        result.qz[i] = qPrj.z;
        result.qw[i] = qPrj.w;
      }

      body.restoreInertia(inertMemo);
      return result;
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

