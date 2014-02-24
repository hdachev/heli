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

        // time - 1 extrapolations
      , x_1 = 0, y_1 = 0, z_1 = 0;

    // Extrapolates a datapoint for interpolating within the first segment, and beyond the end of the last segment.
    // We need to normalize the first two vectors, get their dot product,
    // which is the cosine of the angle between them, and use that
    // to project a mirror point to p2 as p-1.

    // the params are named as if we were extrapolating start-1.
    function extrapolate(
      x0, y0, z0
    , x1, y1, z1
    , x2, y2, z2
    , end
    ) {
      /*jshint onevar:false*/
      if (end)
        n++;

      // Compute the fake start for interpolating within the first segment.
      // We need to normalize the first two vectors, get their dot product,
      // which is the cosine of the angle between them, and use that
      // to project a mirror point to p2 as p-1.
      var dx0 = x1 - x0
        , dy0 = y1 - y0
        , dz0 = z1 - z0
        , dx1 = x2 - x1
        , dy1 = y2 - y1
        , dz1 = z2 - z1

        , A = Math.sqrt(dx0 * dx0 + dy0 * dy0 + dz0 * dz0)
        , B = Math.sqrt(dx1 * dx1 + dy1 * dy1 + dz1 * dz1);

      // Watch out for divison by zero,
      // this will happen if the object's not moving,
      // in which case we can simply use the start of the vector.
      if (!A || !B) {

        // End +1.
        if (end) {
          x.push(x0);
          y.push(y0);
          z.push(z0);
        }

        // Start -1.
        else {
          x_1 = x0;
          y_1 = y0;
          z_1 = z0;
        }

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

      // End +1.
      if (end) {
        x.push(x2 - dx0 * m);
        y.push(y2 - dy0 * m);
        z.push(z2 - dz0 * m);
      }

      // Start -1.
      else {
        x_1 = x2 - dx0 * m;
        y_1 = y2 - dy0 * m;
        z_1 = z2 - dz0 * m;
      }
    }

    this.set = function(xx, yy, zz) {
      x = xx;
      y = yy;
      z = zz;
      n = xx.length; // x, y and z are samelen

      // square peg
      if (n < 3) {

        if (xx.length < 2) {
          xx.push(xx[0]);
          yy.push(yy[0]);
          zz.push(zz[0]);
          n++;
        }

        xx.push(2 * xx[1] - xx[0]);
        yy.push(2 * yy[1] - yy[0]);
        zz.push(2 * zz[1] - zz[0]);
        n++;
      }

      //
      extrapolate(
        xx[0], yy[0], zz[0]
      , xx[1], yy[1], zz[1]
      , xx[2], yy[2], zz[2]
      , false
      );

      // if (n !== xx.length)
      //   throw "badlen A";
    };

    // k must be in (0, N-1)
    this.interpolate = function(k, out) {
      if (k >= n)
        k = n - 0.001;

      // if (n !== x.length)
      //   throw "badlen B";

      var i = Math.floor(k) // the segment we're in
        , w1 = k - i // 0 - 1, intra-segment delta
        , w2 = w1 * w1
        , w3 = w2 * w1

        , a = i - 1
        , b = i
        , c = i + 1
        , d = i + 2;

      // Extrapolate forward as many times as needed so as
      // to ensure we have enough datapoints for a smooth curve.
      while (d >= n)
        extrapolate(
          x[n - 1], y[n - 1], z[n - 1]
        , x[n - 2], y[n - 2], z[n - 2]
        , x[n - 3], y[n - 3], z[n - 3]
        , true
        );

      // Interpolate.
      if (a < 0) {

        // fakestart
        out.x = catmullRom(x_1, x[b], x[c], x[d], w1, w2, w3);
        out.y = catmullRom(y_1, y[b], y[c], y[d], w1, w2, w3);
        out.z = catmullRom(z_1, z[b], z[c], z[d], w1, w2, w3);
      }
      else {
        out.x = catmullRom(x[a], x[b], x[c], x[d], w1, w2, w3);
        out.y = catmullRom(y[a], y[b], y[c], y[d], w1, w2, w3);
        out.z = catmullRom(z[a], z[b], z[c], z[d], w1, w2, w3);
      }
    };

  };

}
());

