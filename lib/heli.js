

// attempt to model the bubbleship's controls and engine setup

(function() {
  "use strict";

  function rotateAroundX(angle) {
    var halfAngle = angle / 2;
    return new THREE.Quaternion(
      Math.sin(halfAngle), 0, 0, Math.cos(halfAngle)
    );
  }

  var emptyAxes = [0, 0, 0, 0]
    , vTmp = new THREE.Vector3
    , qTmp = new THREE.Quaternion
    , vPrj = new THREE.Vector3
    , qPrj = new THREE.Quaternion

    , KMH = 1 / 3600 * 1000
      // forward motion thrust vector orientation -
      // vertical thrust up to VTOL_MAX, then
      // linearly up to backward thrust at JET_MIN.
    , VTOL_MAX = 10 *KMH
    , JET_MIN = 500 *KMH

      // when going backwards
    , REAR_MIN = -10 *KMH
    , REAR_MAX = -200 *KMH

      // gravity wear-off -
      // graviry stops affecting aircraft at GRAV_MAX.
    , GRAV_MIN = 180 *KMH
    , GRAV_MAX = 400 *KMH

    , AFTERBURNER = 150 // m/sec

      // thrust rotation -
      // this is assuming we start with a vertical thrust vector
    , JET = rotateAroundX(Math.PI / -2)
    , REAR = rotateAroundX(Math.PI / 4);

  function denoise(v) {
    return v * v * v;
  }

  function frontalAirspeed(body) {

    // reverse the craft's rotation from the vector of movement,
    // which should give us a north-oriented speed vector.
    body.putVec(vTmp);
    qTmp.copy(body.quaternion);
    qTmp.inverse();
    vTmp.applyQuaternion(qTmp);

    // the component we care about is z.
    // negative means forward since we're going deeper into the scene.
    // result is in meters per second.
    return vTmp.z;
  }

  GAME.setupHelicopter = function(body, mass, gravAmount, liftAmount, yawAmount, pitchAmount, rollAmount) {

    // littlebird empty weight = 722, max takeoff = 1.4
    GAME.setupAircraftInertia(body, mass);

    function advance(vec, rot, control, time) {

      // Control.
      var axes = control && control.axes || emptyAxes
        , throttle = denoise(- axes[1])
        , yaw = denoise(- axes[0])
        , pitch = denoise(axes[3])
        , roll = denoise(- axes[2])
        , afterburner = control && control.buttons[10] > 0.5

          // this is the one value we care about
        , speed = - frontalAirspeed(body)
        , grav = gravAmount
        , antigrav = gravAmount

        , brake = Math.max(0, -throttle)
        , ahead = Math.max(0, throttle);

      // GAME.log(Math.round(speed * 3600 / 1000));

      // Air resistance.
      body.addAirResist(1, time);

      // --- GRAV ---
      // Eliminate gravity past jetspeed.
      if (speed > GRAV_MAX)
        grav = 0;

      // Reduce effect of gravity past GRAV_MIN speed.
      else if (speed > GRAV_MIN)
        grav *= 1 - (speed - GRAV_MIN) / (GRAV_MAX - GRAV_MIN);

      // Apply gravity.
      if (grav)
        body.addVecForce(0, -grav, 0, time);

      // --- THRUST ---
      // Anitgrav amount - during vtol, it's always equal to gravity -
      // during jet flight, it can be throttled down to 0.
      if (speed > 0)
        antigrav = gravAmount * (1 - brake) + grav * brake;
      else
        antigrav = gravAmount * (1 - ahead) + grav * ahead;

      // Start with a vertical thrust vector.
      vTmp.set(0, antigrav + liftAmount * throttle, 0);

      // Jet orientation.
      if (speed > JET_MIN) {
        vTmp.applyQuaternion(JET);

        body.engine = 'JET';
      }

      // VTOL-jet.
      else if (speed > VTOL_MAX) {
        qTmp.set(0, 0, 0, 1);
        qTmp.slerp(JET, (speed - VTOL_MAX) / (JET_MIN - VTOL_MAX) * (ahead + 1) / 2);
        vTmp.applyQuaternion(qTmp);

        body.engine = 'VTOL JET';
      }

      // Rear.
      else if (speed < REAR_MAX)
      {
        vTmp.applyQuaternion(REAR);

        body.engine = 'REV';
      }

      // Rear slerp.
      else if (speed < REAR_MIN) {
        qTmp.set(0, 0, 0, 1);
        qTmp.slerp(REAR, (speed + REAR_MIN) / (REAR_MAX + REAR_MIN) * brake);
        vTmp.applyQuaternion(qTmp);

        body.engine = 'VTOL REV';
      }

      // else vtol
      else
        body.engine = 'VTOL';

      // Apply thrust.
      vTmp.applyQuaternion(rot);
      body.addVecForce(vTmp.x, vTmp.y, vTmp.z, time);

      // --- AFTERBURNER ---
      if (afterburner) {
        vTmp.set(0, AFTERBURNER / 10, -AFTERBURNER);
        vTmp.applyQuaternion(rot);
        body.addVecForce(vTmp.x, vTmp.y, vTmp.z, time);
        body.burner = 'BURNER';
      }
      else
        body.burner = '';

      // --- ROTATION ---

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

