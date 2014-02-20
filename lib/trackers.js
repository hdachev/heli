

/* first attempt at keeping track of / rendering enemy units.

  {
    _id: someid

  , px, py, pz: [now, +1, +2, ...]
  , qx, qy, qz, qw: [now, +1, +2, ...]

  }

*/

(function() {

  var trackers = {}

    , qTmpA = new THREE.Quaternion
    , qTmpB = new THREE.Quaternion
    , qTmpC = new THREE.Quaternion

    , spline = new GAME.Spline();

  function Tracker() {

    var time, data
      , model = GAME.makeBubbleship(0xff4010);

    GAME.scene.add(model);

    this.track = function(dat) {

      // dedupe
      if (data && data.rev && dat.rev === data.rev)
        return;

      time = 0;
      data = dat;

      //
      spline.set(dat.px, dat.py, dat.pz);
    };

    this.position = model.position;

    function extrapolateRotation() {

      // add one rotation datapoint.
      var n = data.qx.length
        , n1 = n - 1
        , n2 = n - 2;

      qTmpA.set(data.qx[n2], data.qy[n2], data.qz[n2], data.qw[n2]);
      qTmpB.set(data.qx[n1], data.qy[n1], data.qz[n1], data.qw[n1]);

      // diff = rotation[n-1] - rotation[n-2]
      qTmpC.multiplyQuaternions(qTmpB, qTmpA.inverse());

      // out = rotation[n-1] + diff
      qTmpB.multiply(qTmpC);

      data.qx.push(qTmpB.x);
      data.qy.push(qTmpB.y);
      data.qz.push(qTmpB.z);
      data.qw.push(qTmpB.w);
    }

    this.redraw = function(delta) {
      time += delta;

      var progress = time * 2
        , prev = Math.floor(progress)
        , t = progress - prev
        , next = prev + 1;

      // lose tracking after a couple of seconds
      if (time > 5)
      {
        delete trackers[data.id];
        GAME.scene.remove(model);
        return;
      }

      // interpolate motion,
      // the spline handles extrapolation
      spline.interpolate(progress, model.position);

      // extrapolate rotation past the last projection
      while (data.qx.length <= next)
        extrapolateRotation();

      // interpolate rotation
      qTmpA.set(data.qx[prev], data.qy[prev], data.qz[prev], data.qw[prev]);
      qTmpB.set(data.qx[next], data.qy[next], data.qz[next], data.qw[next]);
      THREE.Quaternion.slerp(qTmpA, qTmpB, model.quaternion, t);
    };
  }

  GAME.updateTracker = function(data) {

    // we need a movement vector too, perhaps a three point line through which
    // we could fit a catmul rom curve or else with which to project/interpolate motion.
    var id = data._id
      , tracker = trackers[id] || (trackers[id] = new Tracker(id));

    tracker.track(data);
  };

  GAME.redrawTrackers = function(time) {

    // here we go
    var id;
    for (id in trackers)
      trackers[id].redraw(time);
  };

  GAME.foreachTracker = function(f) {
    var id;
    for (id in trackers)
      f(trackers[id]);
  };

}());


