
(function() {

  var effect = new THREE.ShaderPass({

    uniforms: {
      "tDiffuse": { type: "t", value: null }
    }

  , vertexShader:
      "varying vec2 vUv;"
    + "void main() {"
    +   "vUv = uv;"
    +   "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );"
    + "}"

  , fragmentShader:
      "uniform sampler2D tDiffuse;"
    + "varying vec2 vUv;"
    + "void main() {"
    +   "gl_FragColor = texture2D(tDiffuse, vUv).bgra;"
    + "}"

  });

  effect.renderToScreen = true;
  GAME.addPostProcessingPass(effect);
}
());
