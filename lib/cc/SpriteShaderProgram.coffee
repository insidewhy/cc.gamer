cc.module('cc.SpriteShaderProgram').parent('cc.ShaderProgram').jClass {
  init: (options) ->
    do @parent
    @pMatrix = mat4.create()
    @scale = options?.scale or 1
    @refPoint = mat4.create() # reference point at bottom left corner of screen
    @mvMatrix = mat4.create() # current draw point
    return

  attachContext: (gl) ->
    @parent gl
    # this ensures that an object of maximum height will fit exactly in the screen
    zDistance = -@gl.viewportHeight / (2 * @scale)

    mat4.identity @refPoint
    mat4.translate @refPoint, [-gl.viewportWidth / (2 * @scale), zDistance, zDistance]
    return

  _attachSpriteFragmentShader: ->
    content = """
      precision mediump float;

      varying vec2 vTextureCoord;

      uniform vec2 tileSize;   // tile size in percentage of texture size
      uniform vec2 tileOffset; // index of tile e.g. (1,1) = (1 down, 1 right)
      uniform vec2 tileCoord;  // offset into texture of first pixel
      uniform sampler2D sampler;

      // this converts the tile coordinate system to the gl coordinate system
      // First it flips the y-axis. Then it reverses the direction it scans
      // for the current pixel. It also has to add one to the y-offset to make
      // up for it being from the top left rather than the bottom right.
      void main(void) {
        // gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
        gl_FragColor = texture2D(sampler,
          vec2(1, -1) * (
            vec2(vTextureCoord.s, -vTextureCoord.t) * tileSize +
            (tileSize * vec2(tileOffset.s, tileOffset.t + 1.0)) +
            tileCoord));
      }"""
    shader = @gl.createShader @gl.FRAGMENT_SHADER
    @_attachShader shader, content

  _attachSpriteVertexShader: ->
    content = """
        attribute vec3 vertexPosition;
        attribute vec2 textureCoord;

        uniform mat4 mvMatrix;
        uniform mat4 pMatrix;

        varying vec2 vTextureCoord;

        void main(void) {
          gl_Position = pMatrix * mvMatrix * vec4(vertexPosition, 1.0);
          vTextureCoord = textureCoord;
        }"""
    shader = @gl.createShader @gl.VERTEX_SHADER
    @_attachShader shader, content

  # set camera perspective
  perspective: (deg) ->
    # TODO: set min/max based on current scale
    mat4.perspective(deg, @gl.viewportWidth / @gl.viewportHeight, 1.0, 300.0, @pMatrix)
    @gl.uniformMatrix4fv @u.pMatrix, false, @pMatrix

  # location to draw next texture, from bottom left
  # must call this at least once after link and before drawing
  drawAt: (x, y) ->
    mat4.translate @refPoint, [x, y, 0.0], @mvMatrix
    @gl.uniformMatrix4fv @u.mvMatrix, false, @mvMatrix

  # set up initial gl options for the webgl canvas context
  glOptions: ->
    @gl.clearColor 0.0, 0.0, 0.0, 1.0
    @gl.blendFunc @gl.SRC_ALPHA, @gl.ONE
    @gl.enable @gl.BLEND
    @gl.enable @gl.DEPTH_TEST
    @gl.viewport 0, 0, @gl.viewportWidth, @gl.viewportHeight

  # link gl program and then grab pointers to all uniforms and attributes
  link: ->
    do @_attachSpriteFragmentShader
    do @_attachSpriteVertexShader
    do @parent
    @_attribVertices "vertexPosition", "textureCoord"
    @_uniforms "tileSize", "tileOffset", "tileCoord", "sampler",
               "pMatrix", "mvMatrix"
    return
}
# vim:ts=2 sw=2
