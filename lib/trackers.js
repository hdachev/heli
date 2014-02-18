

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
    , qTmpB = new THREE.Quaternion;

  function Tracker() {

    var time, data
      , model = GAME.makeBubbleship(0xff4010);

    GAME.scene.add(model);

    this.track = function(dat) {
      time = 0;
      data = dat;
    };

    this.redraw = function(delta) {
      time += delta;

      var n1 = data.px.length - 1
        , prev = Math.floor(time)
        , next = prev + 1
        , t = time - prev
        , s = 1 - t;

      // lose tracking after a couple of seconds
      if (time > 5)
      {
        delete trackers[data.id];
        GAME.scene.remove(model);
        return;
      }

      // use last datapoint on no more data to work with
      if (prev >= n1) {
        model.position.set(data.px[n1], data.py[n1], data.pz[n1]);
        model.quaternion.set(data.qx[n1], data.qy[n1], data.qz[n1], data.qw[n1]);
        return;
      }

      // interpolate

      // vec
      model.position.set(
        data.px[prev] * s + data.px[next] * t
      , data.py[prev] * s + data.py[next] * t
      , data.pz[prev] * s + data.pz[next] * t
      );

      // rot
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

}());


