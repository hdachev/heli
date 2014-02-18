/**
 * Spline from Tween.js, slightly optimized (and trashed)
 * http://sole.github.com/tween.js/examples/05_spline.html
 *
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */

// TUTI -
// making this non-vector centric and cutting down on the weird stuff.
// meant to be allocated once and then re-parametricized.

(function() {

  // w2 and w2 are w1^2 and w1^3 respectively,
  // probably extracted here to avoid recompute.
  function catmullRom(p0, p1, p2, p3, w1, w2, w3) {
    var v0 = (p2 - p0) * 0.5
      , v1 = (p3 - p1) * 0.5;

    return (
      w3 * (2 * (p1 - p2) + v0 + v1)
    + w2 * (-3 * (p1 - p2) - 2 * v0 - v1)
    + w1 * v0
    + p1
    );
  }

  GAME.Spline = function () {

    //
    var x, y, z, n = 0;
    this.set = function(xx, yy, zz) {
      x = xx;
      y = yy;
      z = zz;
      n = xx.length; // y and z must samelen
    }

    // k must be in (0, N-1)
    this.interpolate = function(k, out) {
      if (k >= n)
        k = n - 0.001;

      var i = Math.floor(k) // the segment we're in
        , w1 = k - i // 0 - 1, intra-segment delta
        , w2 = w1 * w1
        , w3 = w2 * w1

        , a = Math.max(0, i - 1)
        , b = i
        , c = Math.min(n - 1, i + 1)
        , d = Math.min(n - 1, i + 2);

      out.x = catmullRom(x[a], x[b], x[c], x[d], w1, w2, w3);
      out.y = catmullRom(y[a], y[b], y[c], y[d], w1, w2, w3);
      out.z = catmullRom(z[a], z[b], z[c], z[d], w1, w2, w3);
    };

  };
}
());

