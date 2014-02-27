
(function() {

  var TRIGGER = 7; // chainguns are mapped to R2

  function setupBalisticWeapon(name, spec) {

    // install
    GAME.equipment[name] = {
      applyControl: function(tracker, gamepad, time) {
        var fire = gamepad[TRIGGER] > 0.5
          , heat = Math.max(0, Number(tracker.$b_heat) || 0);

        // Balistic weapons
        time /= 3;

        if (fire) {

          // Overheat.
          if (heat + time > 1) {
            if (heat !== 1)
              tracker.$b_heat = 1;

            fire = false;
          }

          // Heat up.
          else
            tracker.$b_heat = heat;
        }

        // Cool down.
        else if (heat > 0)
          tracker.$b_heat = Math.max(0, heat - time);

        // Fire.
        if (fire)
          GAME.trackerSADD(tracker, 'firing', spec);
        else
          GAME.trackerSREM(tracker, 'firing', spec);
      }
    };
  }


  // Weapondry.

/*
  M61 Vulcan
  ----------------+
  Cartridge       |  20×102mm
  Caliber         | 20 mm (0.787 in)
  Barrels         | 6-barrel (progressive RH parabolic twist, 9 grooves)
  Action          | Hydraulically operated, electrically fired, Gatling
  Rate of fire    | 6,000 rounds per minute (M61A1)
                  | 6,600 rounds per minute (M61A2)
  Muzzle velocity | 1,050 metres per second (3,450 ft/s) (with PGU-28/B round)
  Feed system     | Belt or linkless feed system
*/

  setupBalisticWeapon('vulcan', {
    cal: 2
  , vel: 1050
  , rof: 6000
  , amu: 'ap'
  });

}
());

