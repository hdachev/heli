

// prototype wireframe terrain renderer
// works with 4 by 4 planes that are moved around the player

(function() {
  "use strict";
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
    , rev = 1

    , missing = []
    , dirty = []
    , numDirty = 0;


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
      plane.$t_px = 0;
      plane.$t_py = 0;
      plane.$t_rev = rev;
      planes.push(plane);
      GAME.scene.add(plane);
    }

  }());


  //

  function updatePlane(plane) {

    // in case this is not the issue
    var px = plane.$t_px * XSIDE
      , py = plane.$t_py * YSIDE

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

    // frustrum culling needs this
    plane.geometry.computeBoundingSphere();

  }


  //

  function updatePlanes(x, y) {
    var offset = COUNT / 2 - 0.5
      , oX = Math.round(x / XSIDE)
      , oY = Math.round(y / YSIDE)

      , numPlanes = COUNT * COUNT

        // search
      , i, j, px, py, pi, found, plane

      , numMissing = 0;

    // next rev
    if (rev > 0xffffff)
      rev = 1;
    else
      rev ++;

    for (i = 0; i < COUNT; i ++) for (j = 0; j < COUNT; j ++) {

      // try to find a plane among those already rendered
      px = (oX - offset + i);
      py = (oY - offset + j);
      found = false;

      for (pi = 0; pi < numPlanes; pi++) {
        plane = planes[pi];
        if (plane.$t_px === px && plane.$t_py === py) {
          plane.$t_rev = rev;
          found = true;
          break;
        }
      }

      // nope, ain't gonna work
      if (!found) {
        missing[numMissing++] = px;
        missing[numMissing++] = py;
      }
    }

    // reassign planes if need be
    while (numMissing > 0)
      for (i = 0; i < numPlanes; i ++) {
        plane = planes[i];
        if (plane.$t_rev !== rev) {
          plane.$t_py = missing[--numMissing];
          plane.$t_px = missing[--numMissing];

          if (!plane.$t_dirty) {
            plane.$t_dirty = true;
            dirty[numDirty++] = plane;
          }

          break;
        }
      }

    // update one plane per frame
    if (numDirty) {
      plane = dirty[--numDirty];
      plane.$t_dirty = false;
      updatePlane(plane);
    }
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

