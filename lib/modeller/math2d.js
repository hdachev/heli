/*global window:false*/

(function(math2d) {


  // 2d line/segment intersection, trying to make this
  // as generic as possible wrt point objects and coord systems.
  // http://keith-hair.net/blog/tag/intersection/
  // http://blog.controul.com/2009/05/line-segment-intersection/

  math2d.intersectLines = function(Ax, Ay, Bx, By, Ex, Ey, Fx, Fy, out, ABasSeg, EFasSeg) {
    var a1, a2, b1, b2, c1, c2
      , denom;

    a1 = By - Ay;
    b1 = Ax - Bx;
    c1 = Bx * Ay - Ax * By;
    a2 = Fy - Ey;
    b2 = Ex - Fx;
    c2 = Fx * Ey - Ex * Fy;

    denom = a1 * b2 - a2 * b1;
    if (denom === 0)
      return false;

    // Prevent rounding errors from messing up intersection coords when lines are aligned to axes.
    if (Ax === Bx)
      out[0] = Ax;
    else if (Ex === Fx)
      out[0] = Ex;
    else
      out[0] = (b1 * c2 - b2 * c1) / denom;

    if (Ay === By)
      out[1] = Ay;
    else if (Ey === Fy)
      out[1] = Ey;
    else
      out[1] = (a2 * c1 - a1 * c2) / denom;

    // Constrain to segment.
    if (ABasSeg) {
      if ((Ax < Bx) ? out[0] < Ax || out[0] > Bx : out[0] > Ax || out[0] < Bx)
        return false;
      if ((Ay < By) ? out[1] < Ay || out[1] > By : out[1] > Ay || out[1] < By)
        return false;
    }

    if (EFasSeg) {
      if ((Ex < Fx) ? out[0] < Ex || out[0] > Fx : out[0] > Ex || out[0] < Fx)
        return false;
      if ((Ey < Fy) ? out[1] < Ey || out[1] > Fy : out[1] > Ey || out[1] < Fy)
        return false;
    }

    return true;
  };

}
(window.math2d = {}));
