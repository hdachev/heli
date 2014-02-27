

// prototype wireframe terrain renderer
// works with 4 by 4 planes that are moved around the player

(function() {
  /*jshint multistr:true*/

  var vertexShader =
        "                                     \
        varying vec4 color;                   \
        void main() {                         \
                                              \
          gl_Position = projectionMatrix *    \
                        modelViewMatrix *     \
                        vec4(position,1.0);   \
                                              \
          float depth = max(                  \
            0.0                               \
          , 1.0 - gl_Position.z /             \
            " + GAME.camera.far + ".0);       \
                                              \
          float clr = (                       \
            2.0                               \
          + dot(                              \
              normal                          \
            , vec3(0.0, 1.0, 1.0)             \
            )                                 \
          ) / 4.0 * depth;                    \
                                              \
          color = vec4(                       \
            clr * 0.2                         \
          , clr * 0.4                         \
          , clr                               \
          , 1.0                               \
          );                                  \
        }                                     "

    , fragmentShader  =
        "                                     \
        varying vec4 color;                   \
        void main() {                         \
          gl_FragColor = color;               \
        }                                     "

      /*/
    , material = new THREE.MeshBasicMaterial({ color: 0x90cfd9, wireframe: true })
      /*/
    , material = new THREE.ShaderMaterial({
        vertexShader: vertexShader
      , fragmentShader: fragmentShader
      , shading: THREE.FlatShading
      })
      //*/

    , XSIDE = 1000 // meters
    , YSIDE = Math.sqrt(3) * XSIDE / 2
    , VERT = 31
    , COUNT = 6

      // state
    , planes = []
    , dirty = []
    , rev = 0;


  // allocate all terrain geometry
  (function() {
    var numPlanes = COUNT * COUNT
      , plane

      , vrt, i, n = VERT * VERT
      , vx2 = XSIDE / VERT / 2;

    while(numPlanes--) {
      plane = new THREE.Mesh(

        // About the -1:
        // The lengths are specified in segments, while we care about vertices.
        new GAME.RotoPlaneGeometry(XSIDE, YSIDE, VERT - 1, VERT - 1),
        material
      );

      // displace plane vertices as to form an equilateral triangle pattern
      vrt = plane.geometry.vertices;
      for (i = 0; i < n; i ++) {

        // skip every even row
        if (i % (VERT * 2) === 0) {
          i += VERT - 1;
          continue;
        }

        vrt[i].x += vx2;
      }

      plane.rotation.x = Math.PI / -2;
      planes.push(plane);
      GAME.scene.add(plane);
    }

  }());


  //

  function updatePlane(plane) {

    // in case this is not the issue
    var id = plane.id.split(':')
      , px = Number(id[0]) * XSIDE
      , py = Number(id[1]) * YSIDE

      // , vx = XSIDE / (VERT - 1)
      // , vy = YSIDE / (VERT - 1)

      , pos = plane.position
      , vrt = plane.geometry.vertices
      , v

      , i, j, col
      , plot = GAME.plotHeight;

    // move the plane to its new location
    pos.x = px;
    pos.z = py;

    // recalc the vertices
    for (j = 0; j < VERT; j ++) {
      col = j * VERT;
      for (i = 0; i < VERT; i ++)
      {
        v = vrt[i + col];
        v.z = plot(px + v.x, py - v.y);
      }
    }

    // finally, something that does the update
    plane.geometry.verticesNeedUpdate = true;
    plane.geometry.normalsNeedUpdate = true;
    plane.geometry.computeFaceNormals();
    plane.geometry.computeVertexNormals();

    // fixing the broken frustrum culler
    plane.geometry.computeBoundingSphere();

    /* dirty flags
    plane.geometry.elementsNeedUpdate = true;
    plane.geometry.uvsNeedUpdate = true;
    plane.geometry.tangentsNeedUpdate = true;
    plane.geometry.colorsNeedUpdate = true;
    plane.geometry.lineDistancesNeedUpdate = true;
    plane.geometry.buffersNeedUpdate = true;
    // */

  }


  //

  function updatePlanes(x, y) {

    var offset = COUNT / 2 - 0.5
      , oX = Math.round(x / XSIDE)
      , oY = Math.round(y / YSIDE)

      , missing
      , numPlanes = COUNT * COUNT

        // search
      , i, j, px, py, pi, id, found, plane;

    rev ++;
    for (i = 0; i < COUNT; i ++) for (j = 0; j < COUNT; j ++) {

      // plane id, the gemoetry address
      px = (oX - offset + i);
      py = (oY - offset + j);
      id = px + ":" + py;
      found = false;

      //
      for (pi = 0; pi < numPlanes; pi++)
      {
        plane = planes[pi];
        if (plane.id === id)
        {
          plane.rev = rev;
          found = true;
          break;
        }
      }

      // so this gets allocated only once in a while
      if (!found) {
        if (!missing)
          missing = [];

        missing.push(id);
      }
    }

    // reassign planes if need be
    if (missing)
      while (missing.length)
        for (i = 0; i < numPlanes; i ++) {
          plane = planes[i];
          if (plane.rev !== rev) {
            plane.id = missing.pop();
            dirty.push(plane);
            break;
          }
        }

    // update one plane per frame
    if (dirty.length)
      updatePlane(dirty.pop());
  }


  // Attach to render loop, tracking the acting camera.

  (function() {

    var vec = new THREE.Vector3;

    GAME.subscribe(GAME.DRAW_FRAME, function() {
      var cam = GAME.camera
        , x = 0
        , z = 0;

      // we don't really care about the camera position,
      // we care about the direction it is looking.
      // this could play quite well with lod and stuff.
      vec.set(0, 0, -(XSIDE + YSIDE));

      // this doesn't take various transforms into consideration,
      // but this should allow some camera animations
      // to take place without affecting lod and stuff,
      // so might not be too much of a bad idea.
      do {
        x += cam.position.x;
        z += cam.position.z;
        vec.applyQuaternion(cam.quaternion);
      }
      while ((cam = cam.parent));

      updatePlanes(
        x + vec.x
      , z + vec.z
      );
    });
  }
  ());

}
());

