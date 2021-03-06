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

  var EMPTY_OBJ = {}
    , EMPTY_ARR = []
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

  function cloneArr(arr) {
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

  function Vertex(x, y, z, data, classes) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;

    // meta
    this.$data = data || EMPTY_OBJ;
    this.$clas = classes || EMPTY_ARR;
  }

  Vertex.prototype = {

    clone: function() {
      var data = this.$data
        , classes = this.$clas;

      if (data !== EMPTY_OBJ)
        data = cloneObj(data);
      if (classes !== EMPTY_ARR)
        classes = classes.slice();

      return new Vertex(this.x, this.y, this.z, data, classes);
    }

  , setValue: function(key, value) {
      var data = this.$data;
      if (data === EMPTY_OBJ)
        this.$data = data = {};

      data[key] = value;
      return this;
    }

  , getValue: function(key) {
      return this.$data[key];
    }

  , addClass: function(name) {
      var classes = this.$clas;
      if (classes === EMPTY_ARR)
        this.$clas = [name];
      else if (classes.indexOf(name) < 0)
        classes.push(name);
    }

  , hasClass: function(name) {
      return this.$clas.indexOf(name) >= 0;
    }

  , removeClass: function(name) {
      var classes = this.$clas
        , x = classes.indexOf(name);
      if (x >= 0) {
        if (classes.length === 1)
          this.$clas = EMPTY_ARR;
        else
          classes.splice(x, 1);
      }
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


  // Stuff that's common to all vertex collections.

  function VertexCollection() { }

  function Extents(obj) {
    var first = true
      , x0, x1, y0, y1, z0, z1;

    obj.forEachVertex(function(v) {
      if (first) {
        first = false;
        x0 = x1 = v.x;
        y0 = y1 = v.y;
        z0 = z1 = v.z;
      }
      else {
        x0 = Math.min(v.x, x0);
        y0 = Math.min(v.y, y0);
        z0 = Math.min(v.z, z0);
        x1 = Math.max(v.x, x1);
        y1 = Math.max(v.y, y1);
        z1 = Math.max(v.z, z1);
      }
    });

    this.x0 = x0;
    this.y0 = y0;
    this.z0 = z0;
    this.x1 = x1;
    this.y1 = y1;
    this.z1 = z1;
  }

  VertexCollection.prototype = {

    getExtents: function() {
      return new Extents(this);
    }

  , center: function() {
      var extents = this.getExtents()
        , x = extents.x1 + extents.x0
        , y = extents.y1 + extents.y0
        , z = extents.z1 + extents.z0;

      return this.translate(-x/2, -y/2, -z/2);
    }

  , select: function(selector) {
      var selection = new Path();
      this.forEachVertex(function(v) {
        if (selector(v))
          selection.push(v);
      });

      return selection;
    }

  , selectByClass: function(name) {
      return this.select(function(v) {
        return v.hasClass(name);
      });
    }
  };


  //

  function Path(vertices) {
    this.vertices = vertices || [];
  }

  Path.prototype = new VertexCollection;

  Path.prototype.forEachVertex = function(f) {
    this.vertices.forEach(f);
    return this;
  };

  Path.prototype.clone = function() {
    return new Path(cloneArr(this.vertices));
  };

  Path.prototype.getLast = function() {
    var v = this.vertices;
    return v[v.length - 1];
  };

  Path.prototype.push = function(vert) {
    this.vertices.push(vert);
    return this;
  };

  Path.prototype.move = function(x, y, z) {
    var last = this.getLast();
    return this.push(new Vertex(
      last ? last.x + x : x
    , last ? last.y + y : y
    , last ? last.z + z : z
    ));
  };

  Path.prototype.moveTo = function(x, y, z) {
    var last = this.getLast();
    if (x === 0x7fffffff)
      x = last ? last.x : 0;
    if (y === 0x7fffffff)
      y = last ? last.y : 0;
    if (z === 0x7fffffff)
      z = last ? last.z : 0;

    return this.push(
      new Vertex(x, y, z)
    );
  };

  Path.prototype.reverse = function() {
    this.vertices.reverse();
    return this;
  };

  Path.prototype.getVertices = function() {
    return this.vertices;
  };

  Path.prototype.concat = function(path) {
    this.vertices = this.vertices.concat(path.getVertices());
    return this;
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

  function ontoLast(methods) {
    methods.forEach(function(name) {
      var func = Vertex.prototype[name];
      Path.prototype[name] = function() {
        func.apply(this.getLast(), arguments);
        return this;
      };
    });
  }

  ontoLast(['addClass', 'setValue']);


  //

  function Quad(a, b, c, d) {

    // a-d ccw vertices
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;

    // meta
    this.$data = EMPTY_OBJ;
  }

  Quad.prototype = new VertexCollection;

  Quad.prototype.forEachVertex = function(f) {
    f(this.a);
    f(this.b);
    f(this.c);
    f(this.d);
  };

  Quad.prototype.flip = function() {
    var tmp = this.b;
    this.b = this.d;
    this.d = tmp;
    return this;
  };


  //

  function Poly(vertices, quads) {
    this.vertices = vertices;
    this.quads = quads;
  }

  Poly.prototype = new VertexCollection;

  Poly.prototype.forEachVertex = function(f) {
    this.vertices.forEach(f);
  };

  Poly.prototype.forEachQuad = function(f) {
    this.quads.forEach(f);
  };


  //

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

  function multiVertex(method) {
    var slice = Array.prototype.slice
      , func = Vertex.prototype[method];

    return function() {
      var args = slice.call(arguments);
      this.forEachVertex(function(vertex) {
        func.apply(vertex, args);
      });

      return this;
    };
  }

  function multiQuad(method) {
    var slice = Array.prototype.slice
      , func = Quad.prototype[method];

    if (!func)
      return;

    return function() {
      var args = slice.call(arguments);
      this.forEachQuad(function(quad) {
        func.apply(quad, args);
      });

      return this;
    };
  }

  function multify(prototypes, makeMulti, methods) {
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

        func = makeMulti(name);
        if (func)
          prototypes.forEach(setup);
      }
    });
  }

  multify(
    [ Path.prototype
    , Quad.prototype
    , Poly.prototype
    ]

  , multiVertex
  , [ 'add', 'sub'
    , 'multiply', 'multiplyScalar'
    , 'divide', 'divideScalar'
    , 'applyEuler', 'applyAxisAngle'
    , 'applyMatrix3', 'applyMatrix4'
    , 'applyProjection', 'applyQuaternion'
    , 'rotate', 'translate'
    ]
  );

  multify(
    [ Poly.prototype ]
  , multiQuad
  , [ 'flip' ]
  );


  // Exports.

  modeller.VertexPrototype = Vertex.prototype;
  modeller.VertexCollectionPrototype = VertexCollection.prototype;
  modeller.PathPrototype = Path.prototype;
  modeller.QuadPrototype = Quad.prototype;
  modeller.PolyPrototype = Poly.prototype;

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

      // close
      quads.push(new Quad(
        prev[m - 1]
      , curr[m - 1]
      , curr[0]
      , prev[0]
      ));

      prev = curr;
    }

    return new Poly(vertices, quads);
  };

} ( window.modeller = {}
  , window.THREE
  )
);


// plugging stuff in, starting with grow2d

(function(modeller, math2d) {
  var vec = [0.1, 0.1] // float vector
    , PathProto = modeller.PathPrototype;

  function forEachTriple(vertices, f) {
    var prev, next
      , i, n = vertices.length
      , original = vertices.map(function(vertex) {
          return vertex.clone();
        });

    for (i = 0; i < n; i ++) {
      prev = i - 1;
      if (prev === -1)
        prev = n - 1;

      next = i + 1;
      if (next === n)
        next = 0;

      f(original[prev], vertices[i], original[next]);
    }
  }

  function perpRight(x, y, length) {
    var d = Math.sqrt(x * x + y * y);
    if (d !== 0) {
      x = x / d * length;
      y = y / d * length;
    }

    vec[0] = y;
    vec[1] = -x;
  }


  // path is assumed CCW, so we're growing to the right

  function grow(Ax, Ay, Bx, By, Cx, Cy, amount) {
    var x0, y0
      , x1, y1
      , x2, y2
      , x3, y3;

    // move the two edges outward
    perpRight(Bx - Ax, By - Ay, amount);
    x0 = Ax + vec[0];
    y0 = Ay + vec[1];
    x1 = Bx + vec[0];
    y1 = By + vec[1];

    perpRight(Cx - Bx, Cy - By, amount);
    x2 = Bx + vec[0];
    y2 = By + vec[1];
    x3 = Cx + vec[0];
    y3 = Cy + vec[1];

    // intersect them
    math2d.intersectLines(
      x0, y0, x1, y1, x2, y2, x3, y3
    , vec
    );
  }


  // 2d growing/shrinking.

  PathProto.growXY = function(amount) {
    forEachTriple(this.vertices, function(a, b, c) {
      grow(a.x, a.y, b.x, b.y, c.x, c.y, amount);
      b.x = vec[0];
      b.y = vec[1];
    });

    return this;
  };

  PathProto.growXZ = function(amount) {
    forEachTriple(this.vertices, function(a, b, c) {
      grow(a.x, a.z, b.x, b.z, c.x, c.z, amount);
      b.x = vec[0];
      b.z = vec[1];
    });

    return this;
  };

  PathProto.growYZ = function(amount) {
    forEachTriple(this.vertices, function(a, b, c) {
      grow(a.y, a.z, b.y, b.z, c.y, c.z, amount);
      b.y = vec[0];
      b.z = vec[1];
    });

    return this;
  };

}
(window.modeller, window.math2d));

