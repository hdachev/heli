

// so yeah gamepads are awesome but nobody's got them
// so we're gonna pointer lock the shizzle

(function() {
  /*global document:false, navigator:false*/


  // Real gamepads.

  var getGamepads = navigator.webkitGetGamepads && navigator.webkitGetGamepads.bind(navigator)
                 || function() { return navigator.webkitGamepads; }


  // Fake gamepads.

    , fake
    , MOUSE_SENSITIVITY = 1 / 100;

  function requestPointerLock() {
    if (!fake)
      return;

    // request pointer lock
    var elem = document.body;
    (elem.requestPointerLock || elem.mozRequestPointerLock || elem.webkitRequestPointerLock)
      .call(elem);
  }

  function getPointerLockElement() {
    return document.pointerLockElement
        || document.mozPointerLockElement
        || document.webkitPointerLockElement;
  }

  function getFake() {
    if (fake)
      return fake;

    fake = {
      buttons: [
        0, 0, 0, 0
      , 0, 0, 0, 0
      , 0, 0, 0, 0
      , 0, 0, 0, 0
      ]
    , axes: [
        0, 0, 0, 0
      ]
    };

    document.addEventListener("mousemove", function(e) {
      if (!getPointerLockElement())
        return;

      var dx = e.movementX || e.webkitMovementX || 0
        , dy = e.movementY || e.webkitMovementY || 0
        , x = fake.axes[0] + dx * MOUSE_SENSITIVITY
        , y = fake.axes[3] - dy * MOUSE_SENSITIVITY;

      fake.axes[0] = x > 1 ? 1 : x < -1 ? -1 : x;
      fake.axes[3] = y > 1 ? 1 : y < -1 ? -1 : y;
    });

    document.addEventListener("mousedown", function() {
      if (getPointerLockElement())
        fake.buttons[7] = 1;
    });

    document.addEventListener("mouseup", function() {
      if (!getPointerLockElement())
        requestPointerLock();

      fake.buttons[7] = 0;
    });

    var keyboardAxes = {
          87: -1 // awsd
        , 83: 1
        , 65: -2
        , 68: 2

        , 38: -3 // arrows
        , 40: 3
        , 37: -4
        , 39: 4
        }

      , keyboardButtons = {
          84: 4 // t -> target
        , 32: 7 // space -> chaingun
        , 13: 6 // enter -> missile rack
        };

    document.addEventListener("keydown", function(e) {
      var code = e.keyCode
        , axis = keyboardAxes[code]
        , button = keyboardButtons[code];

      if (axis) {
        if (axis < 0)
          fake.axes[-(axis % 4)] = -1;
        else
          fake.axes[(axis % 4)] = 1;
      }
      else if (button)
        fake.buttons[button] = 1;
    });

    document.addEventListener("keyup", function(e) {
      var code = e.keyCode
        , axis = keyboardAxes[code]
        , button = keyboardButtons[code];

      if (axis) {
        if (axis < 0)
          fake.axes[-(axis % 4)] = 0;
        else
          fake.axes[(axis % 4)] = 0;
      }
      else if (button)
        fake.buttons[button] = 0;
    });

    return fake;
  }

  GAME.getGamepad = function() {
    var pads = getGamepads();
    return pads[0] || getFake();
  };

}
());

