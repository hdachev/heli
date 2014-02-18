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
    var x, y, z, n = 0
      , x0 = 0, y0 = 0, z0 = 0;

    this.set = function(xx, yy, zz) {
      /*jshint onevar:false*/

      x = xx;
      y = yy;
      z = zz;
      n = xx.length; // x, y and z are samelen

      // Compute the fake start for interpolating within the first segment.
      // We need to normalize the first two vectors, get their dot product,
      // which is the cosine of the angle between them, and use that
      // to project a mirror point to p2 as p-1.
      var dx0 = x[1] - x[0]
        , dy0 = y[1] - y[0]
        , dz0 = z[1] - z[0]
        , dx1 = x[2] - x[1]
        , dy1 = y[2] - y[1]
        , dz1 = z[2] - z[1]

        , A = Math.sqrt(dx0 * dx0 + dy0 * dy0 + dz0 * dz0)
        , B = Math.sqrt(dx1 * dx1 + dy1 * dy1 + dz1 * dz1);

      // Watch out for divison by zero,
      // this will happen if the object's not moving,
      // in which case we can simply use the start of the vector.
      if(!A || !B) {
        x0 = x[0];
        y0 = y[0];
        z0 = z[0];
        return;
      }

      // normalized A and B.
      var nx0 = dx0 / A
        , ny0 = dy0 / A
        , nz0 = dz0 / A
        , nx1 = dx1 / B
        , ny1 = dy1 / B
        , nz1 = dz1 / B

        , cos = nx0 * nx1
              + ny0 * ny1
              + nz0 * nz1

        , TV = cos * B
        , m = 1 + 2 * TV / A;

      x0 = x[2] - dx0 * m;
      y0 = y[2] - dy0 * m;
      z0 = z[2] - dz0 * m;
    };

    // k must be in (0, N-1)
    this.interpolate = function(k, out) {
      if (k >= n)
        k = n - 0.001;

      var i = Math.floor(k) // the segment we're in
        , w1 = k - i // 0 - 1, intra-segment delta
        , w2 = w1 * w1
        , w3 = w2 * w1

        , a = i - 1
        , b = i
        , c = Math.min(n - 1, i + 1)
        , d = Math.min(n - 1, i + 2);

      if (a >= 0) {
        out.x = catmullRom(x[a], x[b], x[c], x[d], w1, w2, w3);
        out.y = catmullRom(y[a], y[b], y[c], y[d], w1, w2, w3);
        out.z = catmullRom(z[a], z[b], z[c], z[d], w1, w2, w3);
      }

      // use the fake start
      else {
        out.x = catmullRom(x0, x[b], x[c], x[d], w1, w2, w3);
        out.y = catmullRom(y0, y[b], y[c], y[d], w1, w2, w3);
        out.z = catmullRom(z0, z[b], z[c], z[d], w1, w2, w3);
      }
    };

  };
}
());

