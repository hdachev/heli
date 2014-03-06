/*global window:false*/


// my first experimental attempt at a high-level programmatic api for 3d modelling.
// obviously geared towards designing star ships alla homeoworld 2.
// it's poly-oriented (you can only convert to mesh), so there's no notion of triangle,
// everything's boxy.

// i'm planning to reuse loads of math from three js.
// i'm totally not focusing on efficiency/performance.
// in any case, this is on-load stuff, it's not enter-frame stuff.

// CREATIVE BRIEF
// it should be a lambda bliss to use.

(function(modeller, THREE) {

  var EMPTY = {}
    , SUFFIXES = ['XY', 'XZ', 'YZ', 'X', 'Y', 'Z']
    , X_AXIS, Y_AXIS, Z_AXIS;


  // utils

  function inherit(Child, Parent) {
    var oldProto = Child.prototype
      , newProto = Object.create(Parent.prototype)
      , key;

    for (key in oldProto)
      if (newProto[key] !== oldProto[key])
        newProto[key] = oldProto[key];

    Child.prototype = newProto;
  }

  function cloneObj(obj) {
    var res = {}, key;
    for (key in obj)
      if (obj.hasOwnProperty(key))
        res[key] = obj[key];

    return res;
  }

  function cloneArray(arr) {
    return arr.map(function(obj) {
      return obj.clone();
    });
  }

  // generates moveX, moveToXZ style methods
  function axify(proto, methods, zero) {
    methods.forEach(function(method) {
      var func = proto[method];
      if (!func)
        return;
      if (!zero)
        zero = 0;

      proto[method + 'X'] = function(x) {
        return func.call(this, x, zero, zero);
      };

      proto[method + 'Y'] = function(y) {
        return func.call(this, zero, y, zero);
      };

      proto[method + 'Z'] = function(z) {
        return func.call(this, zero, zero, z);
      };

      proto[method + 'XY'] = function(x, y) {
        return func.call(this, x, y, zero);
      };

      proto[method + 'XZ'] = function(x, z) {
        return func.call(this, x, zero, z);
      };

      proto[method + 'YZ'] = function(y, z) {
        return func.call(this, zero, y, z);
      };
    });
  }


  //

  function Vertex(x, y, z, data) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;

    // meta
    this.data = data || EMPTY;
  }

  Vertex.prototype = {

    clone: function() {
      var data = this.data;
      if (data === EMPTY)
        data = cloneObj(data);

      return new Vertex(this.x, this.y, this.z, data);
    }

  , setValue: function(key, value) {
      var data = this.data;
      if (data === EMPTY)
        this.data = data = {};

      data[key] = value;
      return this;
    }

  , getValue: function(key) {
      return this.data[key];
    }

  , translate: function(x, y, z) {
      this.x += x;
      this.y += y;
      this.z += z;
    }

  , scale: function(x, y, z) {
      if (x !== 1)
        this.x *= x;
      if (y !== 1)
        this.y *= y;
      if (z !== 1)
        this.z *= y;
    }

  };

  axify(
    Vertex.prototype
  , [ 'translate' ]
  );

  axify(
    Vertex.prototype
  , [ 'scale' ]
  , 1
  );

  if (THREE) {
    inherit(Vertex, THREE.Vector3);

    X_AXIS = new THREE.Vector3(1, 0, 0);
    Vertex.prototype.rotateX = function(a) {
      this.applyAxisAngle(X_AXIS, a);
      return this;
    };

    Y_AXIS = new THREE.Vector3(0, 1, 0);
    Vertex.prototype.rotateY = function(a) {
      this.applyAxisAngle(Y_AXIS, a);
      return this;
    };

    Z_AXIS = new THREE.Vector3(0, 0, 1);
    Vertex.prototype.rotateZ = function(a) {
      this.applyAxisAngle(Z_AXIS, a);
      return this;
    };

    Vertex.prototype.makeVector = function() {
      return new THREE.Vector3(this.x, this.y, this.z);
    };
  }


  //

  function Path(vertices) {
    this.vertices = vertices ? cloneArray(vertices) : [];
    this.length = this.vertices.length;
  }

  Path.prototype = {
    clone: function() {
      return new Path(this.vertices);
    }

  , last: function() {
      return this.vertices[this.length - 1];
    }

  , PIN: function(x, y, z) {
      this.vertices[this.length ++] = new Vertex(x, y, z);
      return this;
    }

  , move: function(x, y, z) {
      var last = this.last();
      return this.PIN(
        last ? last.x + x : x
      , last ? last.y + y : y
      , last ? last.z + z : z
      );
    }

  , moveTo: function(x, y, z) {
      var last = this.last();
      if (x === 0x7fffffff)
        x = last ? last.x : 0;
      if (y === 0x7fffffff)
        y = last ? last.y : 0;
      if (z === 0x7fffffff)
        z = last ? last.z : 0;

      return this.PIN(x, y, z);
    }

  , setValue: function(key, value) {
      this.last().setValue(key, value);
      return this;
    }

  , label: function(str) {
      return this.setValue('label', str);
    }

    // i'm planning to put this on all vertex owners
  , forEachVertex: function(f) {
      this.vertices.forEach(f);
      return this;
    }

  };

  axify(
    Path.prototype
  , ['move']
  );

  axify(
    Path.prototype
  , ['moveTo']
  , 0x7fffffff
  );


  //

  // poly faces, see, they're not triangles.
  // triangles are bad, DO NOT FAKE TRIANGLES.
  // use polies and then covert to a triangular mesh, it'll be that simple.

  function Quad(a, b, c, d) {

    // a-d ccw vertices
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;

    // meta
    this.data = EMPTY;
  }

  Quad.prototype = {};


  //

  function Poly(vertices, quads) {
    this.vertices = vertices;
    this.quads = quads;
  }

  Poly.prototype = {};


  if (THREE)
    Poly.prototype.makeGeometry = function() {

      // this is horribly inefficient
      // and is of exponential complexity
      var original = this.vertices
        , geom = new THREE.Geometry()
        , vertices = original.map(function(v) {
            return v.makeVector();
          })
        , faces = geom.faces || [];

      // every vertex belongs to four quads
      this.quads.forEach(function(quad) {

        // the bigger the model, the slower these lookups.
        // need to consider speeding this seach up somehow perhaps.
        var a = original.indexOf(quad.a)
          , b = original.indexOf(quad.b)
          , c = original.indexOf(quad.c)
          , d = original.indexOf(quad.d);

        // quad is already CCW
        faces.push(new THREE.Face3(a, b, c));
        faces.push(new THREE.Face3(c, d, a));
      });

      geom.vertices = vertices;
      geom.faces = faces;
      return geom;
    };


  // Commons -
  // Expose vertex transform multicasters on all vertex collections.

  function multiVertex(func) {
    var slice = Array.prototype.slice;
    return function() {
      var args = slice.call(arguments);
      this.forEachVertex(function(vertex) {
        func.apply(vertex, args);
      });

      return this;
    };
  }

  function makeMultiVertex(prototypes, methods) {
    methods.forEach(function(method) {
      var i, name, func
        , setup = function(proto) {
            proto[name] = func;
          };

      for (i = -1; i < 6; i ++) {
        if (i >= 0)
          name = method + SUFFIXES[i];
        else
          name = method;

        func = Vertex.prototype[name];
        if (!func)
          break;

        func = multiVertex(func);
        prototypes.forEach(setup);
      }
    });
  }

  makeMultiVertex(
    [ Path.prototype
    , Quad.prototype
    , Poly.prototype
    ]

  , [ 'add', 'sub'
    , 'multiply', 'multiplyScalar'
    , 'divide', 'divideScalar'
    , 'applyEuler', 'applyAxisAngle'
    , 'applyMatrix3', 'applyMatrix4'
    , 'applyProjection', 'applyQuaternion'

    , 'rotateX', 'rotateY', 'rotateZ'
    , 'translate'
    ]
  );


  // Exports.

  modeller.makePath = function() {
    return new Path();
  };

  // path constructors expect paths to be provided top to bottom
  modeller.makePolyFromPaths = function(paths) {
    return modeller.makePolyFromVertexArrays(paths.map(function(path) {
      return path.vertices;
    }));
  };

  modeller.makePolyFromVertexArrays = function(varrs) {
    var i, n = varrs.length
      , quads = []
      , prev = varrs[0]
      , curr
      , vertices = prev
      , j, m = vertices.length;

    for (i = 1; i < n; i++) {
      curr = varrs[i];
      vertices = vertices.concat(curr);

      // CCW!
      for (j = 1; j < m; j++)
        quads.push(new Quad(
          prev[j - 1]
        , curr[j - 1]
        , curr[j]
        , prev[j]
        ));
    }

    return new Poly(vertices, quads);
  };

} ( window.modeller = {}
  , window.THREE
  )
);

