

// prototype wireframe terrain renderer
// works with 4 by 4 planes that are moved around the player

(function() {

  var material = new THREE.MeshBasicMaterial( {color: 0xffffff, wireframe: true } )

    , SIDE = 500 // plane side is 1km
    , VERT = 32 // this gives us a vertex every 16 meters
    , COUNT = 5

      // state
    , planes = []
    , dirty = []
    , rev = 0;


  // allocate all terrain geometry
  (function() {
    var n = COUNT * COUNT
      , plane;

    while(n--) {
      plane = new THREE.Mesh(

        // About the -1:
        // The lengths are specified in segments, while we care about vertices.
        new THREE.PlaneGeometry(SIDE, SIDE, VERT - 1, VERT - 1),
        material
      );

      plane.rotation.x = Math.PI / -2;
      planes.push(plane);
      GAME.scene.add(plane);
    }

  }());


  //

  function updatePlane(plane) {

    // in case this is not the issue
    var id = plane.id.split(':')
      , px = Number(id[0]) * SIDE
      , py = Number(id[1]) * SIDE
      , vs = SIDE / (VERT - 1)

      , pos = plane.position
      , vrt = plane.geometry.vertices

      , i, j, col
      , plot = GAME.plotHeight;

    // move the plane to its new location
    pos.x = px;
    pos.z = py;

    px -= SIDE / 2;
    py -= SIDE / 2;

    // recalc the vertices
    for (j = 0; j < VERT; j ++) {
      col = j * VERT;
      for (i = 0; i < VERT; i ++)
        vrt[i + col].z = plot(
          px + vs * i
        , py + vs * j
        );
    }

    // repaint the geometry
    plane.geometry.verticesNeedUpdate = true;
    plane.geometry.elementsNeedUpdate = true;
    plane.geometry.normalsNeedUpdate = true;
  }


  //

  function updatePlanes(x, y) {

    var offset = COUNT / 2 - 0.5
      , oX = Math.round(x / SIDE)
      , oY = Math.round(y / SIDE)

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

