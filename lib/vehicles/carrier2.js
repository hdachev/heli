/*global window:false*/

(function(modeller) {

  var XL = 60
    , L = 40
    , M = 20
    , S = 10
    , XS = 5

    , wide
    , upper
    , lower
    , hull;


  wide = modeller.makePath()

    .moveX(M)
    .moveXZ(S, -S)

    .moveZ(-L)
    .moveXZ(S, -M)

    .moveZ(-L)
    .moveXZ(S, -M)

    .moveZ(-XL)
    .moveXZ(-S, -S)
    .moveZ(-S);

  // complete the wide contour with a mirror
  wide = wide.concat(
    wide
      .clone()
      .forEachVertex(function(v) {
        v.x = - v.x;
      })
      .reverse()
  );

  function shrinkX(amount, obj) {
    obj.forEachVertex(function(v) {
      if (v.x > 0)
        v.x -= S;
      else
        v.x += S;
    });

    return obj;
  }

  //
  upper = shrinkX(
    S, wide.clone()
      .translateY(XS)
  );

  //
  lower = shrinkX(
    S, wide.clone()
      .translateY(-S)
  );

  //
  hull = modeller.makePolyFromPaths([
    upper
  , wide
  , lower
  ]);

  //
  hull.center();

  modeller.makeCarrierGeometry = function() {
    return hull.makeGeometry();
  };

}
(window.modeller));


