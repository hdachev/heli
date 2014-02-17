
var GAME = {};


////////////////////////////////
////////////////////////////////
////////////////////////////////

(function() {


  // Setup basics.

  var VIEW_ANGLE = 45
    , NEAR = 0.1
    , FAR = 10000

  // create a WebGL renderer, camera and a scene
    , renderer = new THREE.WebGLRenderer();
    , camera = new THREE.PerspectiveCamera(VIEW_ANGLE, 1, NEAR, FAR);
    , scene = new THREE.Scene();

  // add the camera to the scene
  scene.add(camera);

  // the camera starts at 0,0,0
  // so pull it back
  camera.position.z = 300;

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


  // Gamepads.

  var getGamepads = navigator.webkitGetGamepads && navigator.webkitGetGamepads.bind(navigator)
                 || function() { return navigator.webkitGamepads; };


  // Next frame.

  function nextFrame() {

    // schedule next frame
    requestAnimationFrame(nextFrame);

    // poll
    GAME.pads = getGamepads();

    // tick
    var tick = GAME.tick;
    if (tick)
      tick();

    // render
    renderer.render(scene, camera);
    stats.update();
  }

  requestAnimationFrame(nextFrame);

}
());


