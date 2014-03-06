/*global window:false*/

(function(Math2d) {


  // 2d line/segment intersection -
  // http://keith-hair.net/blog/tag/intersection/
  // http://blog.controul.com/2009/05/line-segment-intersection/

  Math2d.intersectLines = function(A, B, E, F, out, ABasSeg, EFasSeg) {
    var ip
      , a1, a2, b1, b2, c1, c2
      , denom;

    a1 = B.y - A.y;
    b1 = A.x - B.x;
    c1 = B.x * A.y - A.x * B.y;
    a2 = F.y - E.y;
    b2 = E.x - F.x;
    c2 = F.x * E.y - E.x * F.y;

    denom = a1 * b2 - a2 * b1;
    if (denom === 0)
      return false;

    // Prevent rounding errors from messing up intersection coords when lines are aligned to axes.
    if (A.x === B.x)
      out.x = A.x;
    else if (E.x === F.x)
      out.x = E.x;
    else
      out.x = (b1 * c2 - b2 * c1) / denom;

    if (A.y === B.y)
      out.y = A.y;
    else if (E.y === F.y)
      out.y = E.y;
    else
      out.y = (a2 * c1 - a1 * c2) / denom;

    // Constrain to segment.
    if (ABasSeg) {
      if ((A.x < B.x) ? ip.x < A.x || ip.x > B.x : ip.x > A.x || ip.x < B.x)
        return false;
      if ((A.y < B.y) ? ip.y < A.y || ip.y > B.y : ip.y > A.y || ip.y < B.y)
        return false;
    }

    if (EFasSeg) {
      if ((E.x < F.x) ? ip.x < E.x || ip.x > F.x : ip.x > E.x || ip.x < F.x)
        return false;
      if ((E.y < F.y) ? ip.y < E.y || ip.y > F.y : ip.y > E.y || ip.y < F.y)
        return false;
    }

    return true;
  };

}
(window.Math2D = {}));
