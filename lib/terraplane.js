

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
          vec3 light0 = vec3(0.0, 1.0, 1.0);  \
          vec3 light1 = vec3(0.0, 0.5, 1.0);  \
          vec3 light2 = vec3(0.0, 1.0, 0.5);  \
                                              \
          float dot = (                       \
            max(0.0, dot(normal, light0))     \
          + max(0.0, dot(normal, light1))     \
          + max(0.0, dot(normal, light2))     \
          ) / 5.0 * depth;                    \
                                              \
          color = vec4(dot * depth * 0.33, dot * depth, dot * 0.66, 1.0);   \
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
    , COUNT = 8

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


  //

  GAME.redrawTerrain = updatePlanes;

}
());

