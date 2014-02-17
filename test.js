

// Setup the camera as a helicopter.

var littlebird = GAME.camera;

GAME.setupLittlebird(littlebird);


// Ticker.

var last = Date.now();

GAME.tick = function(time) {
  littlebird.addGamepad(
    GAME.pads[0]
  , time
  );
};


// ADD SOME GEOMETRY

// add some geom
var park = new THREE.Mesh(
  new THREE.CubeGeometry(200, 0, 600),
  new THREE.MeshBasicMaterial({ color: 0x00ccff })
);

park.position.y = -2;
park.position.z = 100;
GAME.scene.add(park);

var ndk = new THREE.Mesh(
  new THREE.CubeGeometry(100, 25, 100),
  new THREE.MeshBasicMaterial({ color: 0xffcc00 })
);

ndk.position.y = 10;
GAME.scene.add(ndk);

GAME.camera.position.z = 500;

// add the sphere to the scene

// create a point light
var pointLight =
  new THREE.PointLight(0xFFFFFF);

// set its position
pointLight.position.x = 10;
pointLight.position.y = 50;
pointLight.position.z = 130;

// add to the scene
GAME.scene.add(pointLight);

