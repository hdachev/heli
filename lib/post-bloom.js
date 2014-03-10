
// bloom shader effect

(function() {

  // shaders
  function shader(frag, w, h, glow) {
    var uniforms = {
      tDiffuse: { type: "t", value: null }
    };

    if (w)
      uniforms.w = { type: "f", value: 1.0 / GAME.screenW };
    if (h)
      uniforms.h = { type: "f", value: 1.0 / GAME.screenH };
    if (glow)
      uniforms.tGlow = { type: "t", value: null };

    return new THREE.ShaderMaterial({

      uniforms: uniforms

    , vertexShader:
        "varying vec2 vUv;"
      + "void main() {"
      +   "vUv = uv;"
      +   "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );"
      + "}"

    , fragmentShader:
        "uniform sampler2D tDiffuse;"
      + (glow ? "uniform sampler2D tGlow;" : "")
      + "varying vec2 vUv;"
      + (w ? "uniform float w;" : "")
      + (h ? "uniform float h;" : "")
      + "void main() {" + frag + "}"

    });
  }

  var select = shader(
        "vec3 col = texture2D(tDiffuse, vUv).rgb;"
      + "gl_FragColor = vec4(col * col, 1.0);"
      )

    , hBlur = shader(
        "gl_FragColor = vec4("
      + "  texture2D( tDiffuse, vec2( vUv.x - 4.0 * w, vUv.y ) ).rgb * 0.051"
      + "+ texture2D( tDiffuse, vec2( vUv.x - 3.0 * w, vUv.y ) ).rgb * 0.0918"
      + "+ texture2D( tDiffuse, vec2( vUv.x - 2.0 * w, vUv.y ) ).rgb * 0.12245"
      + "+ texture2D( tDiffuse, vec2( vUv.x - 1.0 * w, vUv.y ) ).rgb * 0.1531"
      + "+ texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ).rgb * 0.1633"
      + "+ texture2D( tDiffuse, vec2( vUv.x + 1.0 * w, vUv.y ) ).rgb * 0.1531"
      + "+ texture2D( tDiffuse, vec2( vUv.x + 2.0 * w, vUv.y ) ).rgb * 0.12245"
      + "+ texture2D( tDiffuse, vec2( vUv.x + 3.0 * w, vUv.y ) ).rgb * 0.0918"
      + "+ texture2D( tDiffuse, vec2( vUv.x + 4.0 * w, vUv.y ) ).rgb * 0.051"
      + ", 1.0"
      + ");"

      , true
      )

    , vBlur = shader(
        "gl_FragColor = vec4("
      + "  texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * h ) ).rgb * 0.051"
      + "+ texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * h ) ).rgb * 0.0918"
      + "+ texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * h ) ).rgb * 0.12245"
      + "+ texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * h ) ).rgb * 0.1531"
      + "+ texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ).rgb * 0.1633"
      + "+ texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * h ) ).rgb * 0.1531"
      + "+ texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * h ) ).rgb * 0.12245"
      + "+ texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * h ) ).rgb * 0.0918"
      + "+ texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * h ) ).rgb * 0.051"
      + ", 1.0"
      + ");"

      , false, true
      )

    , blend = shader(
        "gl_FragColor = vec4(texture2D( tDiffuse, vUv ).rgb + texture2D( tGlow, vUv ).rgb * 2.0, 1.0);"
      , false, false, true
      );


  function BloomPass() {
    this.material = new THREE.ShaderMaterial;

    this.renderToScreen = true;
    this.enabled = true;
    this.needsSwap = true;
    this.clear = false;

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene  = new THREE.Scene();

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.quad);

    this.xRes = Math.floor(GAME.screenW / 2);
    this.yRes = Math.floor(GAME.screenH / 2);

    //
    this.blurTarget1 = new THREE.WebGLRenderTarget(
      this.xRes
    , this.yRes
    , { minFilter: THREE.LinearFilter
      , magFilter: THREE.LinearFilter
      , format: THREE.RGBFormat
      }
    );
    this.blurTarget2 = this.blurTarget1.clone();
  }

  BloomPass.prototype = {

    renderStage: function(renderer, shader, input, output) {
      var uniforms = shader.uniforms;

      // config
      uniforms.tDiffuse.value = input;
      if (uniforms.w)
        uniforms.w.value = 1 / this.xRes;
      if (uniforms.h)
        uniforms.h.value = 1 / this.yRes;

      this.quad.material = shader;

      // render to output
      renderer.render(this.scene, this.camera, output);
    }

  , blendStage: function(renderer, readBuffer, glowBuffer, writeBuffer) {
      var uniforms = blend.uniforms;

      // config
      uniforms.tDiffuse.value = readBuffer;
      uniforms.tGlow.value = glowBuffer;

      this.quad.material = blend;

      // and we're done!
      if (this.renderToScreen)
        renderer.render(this.scene, this.camera);
      else
        renderer.render(this.scene, this.camera, writeBuffer, this.clear);
    }

  , render: function(renderer, writeBuffer, readBuffer) {
      var buf1 = this.blurTarget1
        , buf2 = this.blurTarget2;

      // render the selected colors onto lowres targ1
      this.renderStage(renderer, select, readBuffer, buf1);

      // blur horizontally onto lowres targ2
      this.renderStage(renderer, hBlur, buf1, buf2);

      // blur vertically back onto lowres targ1
      this.renderStage(renderer, vBlur, buf2, buf1);

      // we're done with the glow overlay
      this.blendStage(renderer, readBuffer, buf1, writeBuffer);
    }
  };

  GAME.addPostProcessingPass(new BloomPass);

}
());
