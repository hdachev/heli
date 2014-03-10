

// trying to set up the render loop in such a way as to be able
// to enable/disable post-processing steps or all post-processing altogether
// depending on frame rate.

(function() {
  /*global window:false, document:false*/


  // Setup basics.

  var VIEW_ANGLE = 45
    , NEAR = 0.1
    , FAR = 4000

    , renderer = new THREE.WebGLRenderer({ antialias: true} )
    , camera = new THREE.PerspectiveCamera(VIEW_ANGLE, 1, NEAR, FAR)
    , scene = new THREE.Scene

    , composer;

  GAME.NEAR = NEAR;
  GAME.FAR = FAR;

  GAME.scene = scene;
  GAME.camera = camera;


  // Init.

  scene.add(camera);
  document.body.appendChild(renderer.domElement);

  function resize() {
    var w = window.innerWidth
      , h = window.innerHeight;

    GAME.screenW = w;
    GAME.screenH = h;

    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();


  // Post processing.

  GAME.addPostProcessingPass = function(pass) {

    // init post processing when first demanded
    if (!composer) {
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
    }

    composer.addPass(pass);
  };


  // Render.

  GAME.subscribe(GAME.DRAW_FRAME, function() {
    if (composer)
      composer.render();
    else
      renderer.render(scene, camera);
  });


  // Projector.

  (function() {
    var projector = new THREE.Projector
      , vPrj = new THREE.Vector3;

    GAME.worldToScreen = function(world3) {
      vPrj.copy(world3);
      return projector.projectVector(vPrj, camera);
    };
  }
  ());

}
());

