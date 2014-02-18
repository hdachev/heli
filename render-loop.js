
var GAME = {};


////////////////////////////////
////////////////////////////////
////////////////////////////////

(function() {


  // Setup basics.

  var VIEW_ANGLE = 45
    , NEAR = 0.1
    , FAR = 1500

  // create a WebGL renderer, camera and a scene
    , renderer = new THREE.WebGLRenderer({ antialias: true} )
    , camera = new THREE.PerspectiveCamera(VIEW_ANGLE, 1, NEAR, FAR)
    , scene = new THREE.Scene()

    , light;

  GAME.scene = scene;
  GAME.camera = camera;

  // fog
  scene.fog = new THREE.Fog( 0x000000, 10, 1250 );

  // a light
  // light = new THREE.DirectionalLight( 0xff0000, 1 );
  // light.position.set( 1, 1, 0 );
  // scene.add(light);

  // add the camera to the scene
  scene.add(camera);

  // attach the render-supplied DOM element
  document.body.appendChild(renderer.domElement);


  // Resize the renderer on window resize.

  function resize() {
    var w = window.innerWidth
      , h = window.innerHeight;

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


  // Loggers & huD.

  function box(className) {
    var box = document.createElement("div");
    box.className = className;
    document.body.appendChild(box);
    return box;
  }

  var logbox = box("logbox");

  var log = [];

  GAME.log = function() {
    log.push(Array.prototype.slice.call(arguments).join(" "));
    if (log.length > 10)
      log.shift();

    logbox.innerText = log.join("\n");
  };


  // Hud.

  var alt = box("altitude")
    , spd = box("airspeed");

  function updateHud() {
    if (!camera.getGroundspeed)
      return;

    spd.innerText = Math.round(camera.getGroundspeed() * 3600 / 1000) + " kmh";
    alt.innerText = Math.round(camera.position.y - GAME.plotHeight(camera.position.x, camera.position.z)) + " m";
  }


  // Gamepads.

  var getGamepads = navigator.webkitGetGamepads && navigator.webkitGetGamepads.bind(navigator)
                 || function() { return navigator.webkitGamepads; };


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
    // setTimeout(nextFrame, 100);

    // poll controller
    GAME.pads = getGamepads();

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
    updateHud();
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


