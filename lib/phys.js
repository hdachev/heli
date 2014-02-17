

// Naive atmospheric flight math.
// Meaning this to do for both helicopter and jet flight.

(function() {
  "use strict";

  // Reusables.
  var vTmp  = new THREE.Vector3
    , qTmp  = new THREE.Quaternion
    , qUnit = new THREE.Quaternion;

  GAME.setupAircraftInertia = function(body, mass) {

    // State.

    // Movement, x/y/z amounts per second.
    var x = 0, y = 0, z = 0

    // Keeping rotational inertia as a quaternion.
      , rot = new THREE.Quaternion;


    // Silly air resistance.
    // It's geometric, so this should be an automatic speed and rotation limit.
    body.addAirResist = function(amount, time) {
      var m = amount * time / mass;

      // Cut down on all inertial amounts.
      x -= x * m;
      y -= y * m;
      z -= z * m;

      // Notice that time must be <1.
      // I need some reasonable constant here, otherwise stuff will rotate forever.

      rot.slerp(qUnit, m);
    };

    // Gravity, thrust, nearby explosions, etc.
    body.addVecForce = function(ax, ay, az, time) {
      // GAME.log("addVecForce", ax, ay, az, time);

      var m = time / mass;

      x += ax * m;
      y += ay * m;
      z += az * m;
    };

    // Add some rotation to the mix.
    // Provided as an axis and angle for readability.
    // This is a reasonable format for "engines" to generate rotation,
    // it'll be more reasonable and easier to read.
    body.addRotForce = function(x, y, z, angle, time) {
      var m = time / mass;

      // Avoid garbage.
      vTmp.set(x, y, z);
      qTmp.setFromAxisAngle(vTmp, angle * m);

      // Add the effect.
      rot.multiply(qTmp);

      // Normalize to prevent the accumulation rounding errors.
      // This could occur periodically, no need to constantly re-normalize.
      rot.normalize();
    };


    // Applying these values to outside world stuff.
    body.applyVec = function(vec, time) {

      vec.x += x * time;
      vec.y += y * time;
      vec.z += z * time;
    };

    body.applyRot = function(quat, time) {

      // Avoid garbage.
      qTmp.copy(qUnit);
      qTmp.slerp(rot, time);

      // Add the effect.
      quat.multiply(qTmp);
    };


    // meters per sec
    body.getAirspeed = function() {
      return Math.sqrt(x * x + y * y + z * z);
    };

    body.getGroundspeed = function() {
      return Math.sqrt(x * x + z * z);
    };


    // SAFETY

    // Mass in tonns.
    if (typeof mass !== 'number' || mass < 1 || mass > 100)
      throw new Error("Bad mass.");

  };

}
());

