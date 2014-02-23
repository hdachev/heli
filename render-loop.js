

// core namespace

var GAME = {
  models: {} // 3d models and the like
, updateHandlers: {} // object update handlers

  // game server
, host: 'drncmdr.herokuapp.com'
};


////////////////////////////////
////////////////////////////////
////////////////////////////////

(function() {


  // Setup basics.

  var VIEW_ANGLE = 45
    , NEAR = 0.1
    , FAR = 4000

  // create a WebGL renderer, camera and a scene
    , renderer = new THREE.WebGLRenderer({ antialias: true} )
    , camera = new THREE.PerspectiveCamera(VIEW_ANGLE, 1, NEAR, FAR)
    , scene = new THREE.Scene

    , projector = new THREE.Projector
    , vPrj = new THREE.Vector3;

  GAME.scene = scene;
  GAME.camera = camera;

  //
  GAME.worldToScreen = function(world3) {
    vPrj.copy(world3);
    return projector.projectVector(vPrj, camera);
  };

  // add the camera to the scene
  scene.add(camera);

  // attach the render-supplied DOM element
  document.body.appendChild(renderer.domElement);


  // Resize the renderer on window resize.

  function resize() {
    var w = window.innerWidth
      , h = window.innerHeight;

    //
    GAME.screenW = w;
    GAME.screenH = h;

    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();


  // Stats.

  var stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);


  // Next frame.

  var lastTick = Date.now()
    , paused = false
    , pausing = false;

  function nextFrame() {
    var now = Date.now()
      , delta = now - lastTick;

    // more than a minute gone missing means major crysis
    if (delta > 60000) {
      window.location.reload();
      throw new Error("Simulation too old.");
    }

    lastTick = now;

    // schedule next frame
    if (paused) {
      pausing = false;
      return;
    }

    requestAnimationFrame(nextFrame);

    // tick simulation
    var tick = GAME.tick;
    if (tick) {

      // all of our math expects sub-second time res
      while (delta > 250) {
        delta -= 250;
        tick(0.25);
      }

      // tick delta is in seconds
      tick(delta / 1000);
    }

    // render
    renderer.render(scene, camera);
    stats.update();
  }

  requestAnimationFrame(nextFrame);

  GAME.pause = function() {
    paused = true;
    pausing = true;
  };

  GAME.resume = function() {
    if (!pausing)
      lastTick = Date.now();

    if (paused) {
      paused = false;
      if (!pausing)
        nextFrame();
      else
        pausing = false;
    }
  }

}
());


