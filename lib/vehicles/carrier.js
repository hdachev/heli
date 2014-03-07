/*global window:false*/

// experiment in functional modelling
// this will be quite nice if successful since it'll allow for
// pseudo-random parametric buildings and ships

(function(modeller) {

/*
  This is an api design exercise.
  Trying to model the main hull of a captial ship with more or less this structure

  top                 front
   _____               ____________
  //   \\             /_/__________\
  || F | \               \________/
  ||   | |
  \\   | |
   ||  | |
  //   |/
  || B ||
  \\___//

*/

  var LENGTH = 380
    , WIDTH = 80

    , FRONT_Z = - LENGTH / 2
    , BACK_Z = LENGTH / 2
    , LEFT_X = - WIDTH / 2

    , CHOP = 10
    , MID_CHOP = 25

      // starting with only two contours
    , wide, hull;


  // this is our wide contour

  wide = modeller.makePath()

    // front side and right corner
    .moveToXZ(LEFT_X, FRONT_Z).label('fleft')
    .moveX(WIDTH).label('fright')
    .moveXZ(MID_CHOP, MID_CHOP)

    // long right side and corners
    .moveZ(LENGTH * 0.6)
    .moveXZ(CHOP, CHOP)
    .moveZ(LENGTH * 0.1)

    .moveXZ(-MID_CHOP, MID_CHOP)
    .moveToZ(BACK_Z) // an abs move to back guide

    // back side and corners
    .moveXZ(-CHOP, CHOP).label('bright')
    .moveToX(LEFT_X).label('bleft')
    .moveXZ(-CHOP, -CHOP)

    // moving back forward, inner cut midway through
    .moveZ(-LENGTH * 0.2).label('inback')
    .moveXZ(MID_CHOP, -MID_CHOP)
    .moveZ(-LENGTH * 0.3)
    .moveXZ(-MID_CHOP, -MID_CHOP).label('infore')

    // now what's the most elegant way to close the shape?
    // not this probably but hell
    .moveToXZ(LEFT_X - CHOP, FRONT_Z + CHOP)

    // dunno why i did this CW
    .reverse();


  // lets start with the same contour,
  // contract it and displace it vertically.


  // this is our hull

  hull = modeller.makePolyFromPaths([
    wide.clone().translateY(CHOP / 2).growXZ(CHOP)
  , wide.clone()
  , wide.clone().growXZ(CHOP)
  , wide.clone().translateY(-CHOP).growXZ(1.5 * CHOP)
  ]);


  // now we need a hole through the lower deck,
  // through which we'll have to fly through for rearming and the like



  //

  modeller.makeCarrierGeometry = function() {
    return hull.makeGeometry();
  };

}
(window.modeller));


