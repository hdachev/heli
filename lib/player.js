

// first attempt of getting closer to actual gameplay -
// i'm trying to streamline the adding and removeal of player-controlled vehicles,
// attaching and detaching first-person camera logic and the like.

(function() {

  var avatar
    , loadout

    , publish = GAME.publish
    , PLAYER_KILLED = GAME.PLAYER_KILLED

    , ZEROVEC = new THREE.Vector3;

  GAME.subscribe(GAME.TRACKER_KILLED, function(tracker) {
    if (tracker !== avatar)
      return;

    // disconnect the avatar
    GAME.setPlayerAvatar(null);

    // put camera above the kill site
    // and make it look down vertically
    var camera = GAME.camera;

    GAME.scene.add(camera);
    camera.position.copy(tracker.position);
    camera.position.y += 500;
    camera.lookAt(tracker.position);

    // announce player death
    publish(PLAYER_KILLED, tracker);
  });

  GAME.subscribe(GAME.SIM_FRAME, function(time) {
    if (!avatar)
      return;

    var gamepad = GAME.getGamepad()
      , i, n = loadout ? loadout.length : 0;

    // motor
    avatar.applyControl(gamepad, time);

    // weapons and gadgets
    for (i = 0; i < n; i ++)
      loadout[i].applyControl.call(avatar, gamepad, time);
  });


  // Avatar control.

  GAME.getPlayerAvatar = function() {
    return avatar;
  };

  GAME.setPlayerAvatar = function(tracker) {
    if (avatar === tracker)
      return;

    // safefail
    // do stuff that can throw before changing gameplay state

    // install vehicle controls
    if (tracker && !('isPlayerAvatar' in tracker)) {
      var trackerData = GAME.getTrackerData(tracker);
      if (trackerData.t !== 'v')
        throw "Not a vehicle.";

      GAME.controls[trackerData.m](tracker);
    }

    // /safefail

    // TODO select loadout
    loadout = null;

    // disconnect previous tracker
    if (avatar) {
      avatar.isPlayerAvatar = false;

      // show all children
      avatar.visible = true;
      avatar.traverse(function(child) {
        child.visible = true;
      });
    }

    // connect new tracker
    avatar = tracker;
    if (avatar) {
      avatar.isPlayerAvatar = true;

      // hide all children
      avatar.visible = false;
      avatar.traverse(function(child) {
        child.visible = false;
      });

      // attach the camera to this avatar
      GAME.camera.position.copy(ZEROVEC);
      avatar.add(GAME.camera);
    }
  };
}
());

