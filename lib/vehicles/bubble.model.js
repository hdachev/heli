

(function() {

  /*

    BELL 47 spec

    Main Rotor Diameter: 11.32m
    Tail Rotor Diameter: 1.87m

    Length (Fuselage): 9.63m
    Length: 13.30m
    Height: 2.84m

  */

  var ENGINE_RAD = 1.15
    , ENGINE_X = ENGINE_RAD * 2.2
    , CABIN_RAD = 1.35
    , CABIN_Z = - CABIN_RAD * 2
    , CABIN_Y = - CABIN_RAD / 3

    , TAIL_LEN = 13.3 - (CABIN_RAD)
    , TAIL_Z = TAIL_LEN / 2 + CABIN_Z

      // amount of detail on engines and cambine
    , LOD = 8;

  function makeSphere(material, rad) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(rad, LOD, LOD)
    , material
    );
  }

  function addEngine(group, material, left) {
    var engine = makeSphere(material, ENGINE_RAD);

    if (left)
    {
      group.leftEngine = engine;
      engine.position.x = - ENGINE_X;
    }
    else
    {
      group.rightEngine = engine;
      engine.position.x = ENGINE_X;
    }

    group.add(engine);
  }

  function addCabin(group, material) {
    var cabine = makeSphere(material, CABIN_RAD);
    cabine.position.z = CABIN_Z;
    cabine.position.y = CABIN_Y;
    group.cabine = cabine;
    group.add(cabine);
  }

  function addTail(group, material) {
    var tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.75, TAIL_LEN)
    , material
    );

    tail.position.z = TAIL_Z;
    group.add(tail);
  }


  // makeBubbleship()

  GAME.models.bubble = function(config) {
    var material = new THREE.MeshBasicMaterial({ color: config.color || 0xffffff })
      , group = new THREE.Object3D();

    addCabin(group, material);
    addEngine(group, material, true);
    addEngine(group, material, false);
    addTail(group, material);

    return group;
  };


}
());

