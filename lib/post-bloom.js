
// bloom shader effect

(function() {

  // shaders
  function makeShader(frag, usesGlowMap) {
    var uniforms = {
      tDiffuse: { type: "t", value: null }
    };

    if (usesGlowMap)
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
      + (usesGlowMap ? "uniform sampler2D tGlow;" : "")
      + "varying vec2 vUv;"
      + "void main() {" + frag + "}"

    });
  }

  function makeBlurKernel(horizontal) {
    return new THREE.ShaderMaterial({

      uniforms: {
        tDiffuse: { type: "t", value: null }
      , res:
        { type: "f"
        , value: horizontal
          ? 1 / GAME.screenW
          : 1 / GAME.screenH
        }
      }

      // As per http://xissburg.com/faster-gaussian-blur-in-glsl/
      // I'm precomputing the sampling coordinates in order to allow non-dependent texture reads -

      // "A non-dependent texture read is one where the coordinates are either a constant or a varying.
      // According to the PowerVR Performance Recommendations, a dependent texture read adds a lot of additional steps
      // in the processing of your shader because the texture coordinates cannot be known ahead of time.
      // When you use a constant or a varying, the hardware is able to pre-fetch the texture data
      // before it gets to run your fragment shader, hence it becomes way more efficient."

    , vertexShader:
        "uniform float res;"
      + "varying vec2 rUv[9];"
      + "void main() {"
      +   "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );"

      + ( horizontal

        ? "rUv[0] = vec2( uv.x - 4.0 * res, uv.y );"
        + "rUv[1] = vec2( uv.x - 3.0 * res, uv.y );"
        + "rUv[2] = vec2( uv.x - 2.0 * res, uv.y );"
        + "rUv[3] = vec2( uv.x - 1.0 * res, uv.y );"
        + "rUv[4] = vec2( uv.x, uv.y );"
        + "rUv[5] = vec2( uv.x + 1.0 * res, uv.y );"
        + "rUv[6] = vec2( uv.x + 2.0 * res, uv.y );"
        + "rUv[7] = vec2( uv.x + 3.0 * res, uv.y );"
        + "rUv[8] = vec2( uv.x + 4.0 * res, uv.y );"

        : "rUv[0] = vec2( uv.x, uv.y - 4.0 * res );"
        + "rUv[1] = vec2( uv.x, uv.y - 3.0 * res );"
        + "rUv[2] = vec2( uv.x, uv.y - 2.0 * res );"
        + "rUv[3] = vec2( uv.x, uv.y - 1.0 * res );"
        + "rUv[4] = vec2( uv.x, uv.y );"
        + "rUv[5] = vec2( uv.x, uv.y + 1.0 * res );"
        + "rUv[6] = vec2( uv.x, uv.y + 2.0 * res );"
        + "rUv[7] = vec2( uv.x, uv.y + 3.0 * res );"
        + "rUv[8] = vec2( uv.x, uv.y + 4.0 * res );"

        )

      + "}"

    , fragmentShader:
        "uniform sampler2D tDiffuse;"
      + "varying vec2 rUv[9];"
      + "void main() {"

      +   "gl_FragColor = vec4("
      +   "  texture2D( tDiffuse, rUv[0] ).rgb * 0.051"
      +   "+ texture2D( tDiffuse, rUv[1] ).rgb * 0.0918"
      +   "+ texture2D( tDiffuse, rUv[2] ).rgb * 0.12245"
      +   "+ texture2D( tDiffuse, rUv[3] ).rgb * 0.1531"
      +   "+ texture2D( tDiffuse, rUv[4] ).rgb * 0.1633"
      +   "+ texture2D( tDiffuse, rUv[5] ).rgb * 0.1531"
      +   "+ texture2D( tDiffuse, rUv[6] ).rgb * 0.12245"
      +   "+ texture2D( tDiffuse, rUv[7] ).rgb * 0.0918"
      +   "+ texture2D( tDiffuse, rUv[8] ).rgb * 0.051"
      +   ", 1.0"
      +   ");"

      + "}"

    });
  }

  var select = makeShader(
        "vec3 col = texture2D(tDiffuse, vUv).rgb;"
      + "gl_FragColor = vec4(col * col * col, 1.0);"
      )

    , hBlur = makeBlurKernel(true)
    , vBlur = makeBlurKernel(false)

    , blend = makeShader(
        "gl_FragColor = vec4(texture2D( tDiffuse, vUv ).rgb + texture2D( tGlow, vUv ).rgb * 2.0, 1.0);"
      , true
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

    this.xRes = Math.round(GAME.screenW / 2);
    this.yRes = Math.round(GAME.screenH / 2);

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
