

// core namespace

var GAME = {

  // network cfg
  INTER_RES: 2 // interpolation units per second
// , server: 'drncmdr.herokuapp.com'

  // vehicles
, models: {} // 3d models and the like
, controls: {} // control setups for playable vehicles

  // equipment registry
, equipment: {}

  // infrastructure
, updateHandlers: {} // object update handlers

  // sys channels
, SIM_FRAME: 'sim'
, DRAW_FRAME: 'draw'

  // game events
, PLAYER_KILLED: 'pkil'

, TRACKER_KILLED: 'ukil'
, TRACKER_REMOVED: 'urem'
, TRACKER_ADDED: 'uadd'
, TRACKER_UPDATED: 'uupd'

};



// pubsub

(function() {
  var channels = {};

  GAME.subscribe = function(channel, receiver) {
    if (!channel || typeof channel !== 'string')
      throw "Bad channel.";
    if (!channels[channel])
      channels[channel] = [];

    channels[channel].push(receiver);
  };

  GAME.publish = function(channel, a, b, c) { // abc are optional callargs
    var receivers = channels[channel]
      , i, n = receivers.length;
    for (i = 0; i < n; i++)
      receivers[i](a, b, c);
  };

}
());


// idgen and revgen

(function() {

  //
  GAME.nextId = function() {
    return Math.round(Math.random() * 0xfffffff);
  };

  //
  GAME.nextRev = function(prev) {
    if (prev > 0 && prev < 0xfffffff)
      return prev + 1;
    else
      return 1;
  };

  GAME.isNewerRev = function(rev, prev) {
    return rev > prev || (prev - rev > 0xf000000);
  };
}
());


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
    , vPrj = new THREE.Vector3

    , render = function() {
        renderer.render(scene, camera);
      };


  // POST PROCESSING.
  if (THREE.EffectComposer)
    (function() {
      var composer = new THREE.EffectComposer(renderer)
        , shader, effect;

      composer.addPass(new THREE.RenderPass(scene, camera));

      // effect = new THREE.ShaderPass( THREE.DotScreenShader );
      // effect.uniforms['scale'].value = 4;
      // composer.addPass( effect );

      // effect = new THREE.ShaderPass( THREE.RGBShiftShader );
      // effect.uniforms['amount'].value = 0.0015;
      // effect.renderToScreen = true;
      // composer.addPass( effect );

      // a custom shader

      shader = {

        uniforms: {

          "tDiffuse": { type: "t", value: null },
          "offset":   { type: "f", value: 1.0 },
          "darkness": { type: "f", value: 1.0 }

        },

        vertexShader: [

          "varying vec2 vUv;",

          "void main() {",

            "vUv = uv;",
            "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

          "}"

        ].join("\n"),

        fragmentShader: [

          "uniform float offset;",
          "uniform float darkness;",

          "uniform sampler2D tDiffuse;",

          "varying vec2 vUv;",

          "void main() {",

            // Eskil's vignette

            "gl_FragColor = texture2D( tDiffuse, vUv ).gbra;",

          "}"

        ].join("\n")

      };

      // a shader pass
      effect = new THREE.ShaderPass(shader);
      effect.renderToScreen = true;
      composer.addPass(effect);

      render = function() {
        composer.render();
      };
    }
    ());

  //


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

    GAME.screenW = w;
    GAME.screenH = h;

    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();


  // Next frame.

  var lastTick = Date.now()
    , paused = false
    , pausing = false

    , publish = GAME.publish
    , SIM_FRAME = GAME.SIM_FRAME
    , DRAW_FRAME = GAME.DRAW_FRAME;

  function nextFrame() {
    var now = Date.now()
      , delta = now - lastTick
      , simDelta = delta;

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

    // a zero/neg delta will fuck up things forever,
    // and since we depend on wall-clock time, stuff can go wrong
    if (delta < 1)
      return;

    // ----------
    // SIMULATION
    // all of our math expects sub-second time res -
    // catch up without before rendering, in case stuff slowed down

    while (simDelta > 250) {
      simDelta -= 250;
      publish(SIM_FRAME, 0.25);
    }

    publish(SIM_FRAME, simDelta / 1000);

    // -------
    // DRAWING

    // hud and the like
    publish(DRAW_FRAME, delta / 1000);

    // 3d layer
    render();
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
  };

}
());


