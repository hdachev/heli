

/* first attempt at keeping track of / rendering enemy units.

  {
    _id: someid

  , px, py, pz: [now, +1, +2, ...]
  , qx, qy, qz, qw: [now, +1, +2, ...]

  }

*/

(function() {

  var trackers = {};

  function Tracker() {

    var last = 0, vec = null

        //
      , model = GAME.makeBubbleship(0xff0000);

    GAME.scene.add(model);

    this.track = function(data, time) {
      last = time;
      vec = data;
    };

    this.redraw = function(time) {

      // lose tracking
      if (time - last > 5)
      {
        delete trackers[id];
        GAME.scene.remove(model);
      }

      // update visual
      else
      {
        model.position.set(vec.px[0], vec.py[0], vec.pz[0]);
        model.quaternion.set(vec.qx[0], vec.qy[0], vec.qz[0], vec.qw[0]);
      }
    };
  }

  GAME.updateTracker = function(data, time) {

    // we need a movement vector too, perhaps a three point line through which
    // we could fit a catmul rom curve or else with which to project/interpolate motion.
    var id = data._id
      , tracker = trackers[id] || (trackers[id] = new Tracker(id));

    tracker.track(data, time);
  };

  GAME.redrawTrackers = function(time) {

    // here we go
    var id;
    for (id in trackers)
      trackers[id].redraw(time);
  };

}());


