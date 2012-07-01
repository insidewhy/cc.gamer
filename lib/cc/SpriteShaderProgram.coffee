cc.module('cc.SpriteShaderProgram').parent('cc.ShaderProgram').jClass {
  gl: null
  scale: 1

  init: ->
    do @parent
    @pMatrix = mat4.create()
    @mvMatrix = mat4.create() # reference point at bottom left corner of screen
    return

  attachContext: (gl) ->
    @parent gl

    # this is the standard texture used to draw pretty much all sprites
    @textureBuffer = gl.createBuffer()
    gl.bindBuffer gl.ARRAY_BUFFER, @textureBuffer
    textureCoords = [
      1.0, 1.0,
      0.0, 1.0,
      1.0, 0.0,
      0.0, 0.0 ]
    gl.bufferData gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW
    @textureBuffer.itemSize = 2
    @textureBuffer.numItems = 4

  activateTexture: (spritesheets) ->
    @gl.bindBuffer @gl.ARRAY_BUFFER, @textureBuffer
    @gl.vertexAttribPointer @a.textureCoord, @textureBuffer.itemSize, @gl.FLOAT, false, 0, 0
    # TODO: read idx from spritesheets object
    @gl.activeTexture @gl.TEXTURE0
    @gl.bindTexture @gl.TEXTURE_2D, spritesheets.glTexture
    @gl.uniform1i @u.sampler, 0
    this

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
        uniform vec3 position;

        varying vec2 vTextureCoord;

        void main(void) {
          gl_Position = pMatrix * mvMatrix * vec4(vertexPosition + position, 1.0);
          vTextureCoord = textureCoord;
        }"""
    shader = @gl.createShader @gl.VERTEX_SHADER
    @_attachShader shader, content

  selectTile: (tileSize, tileOffset, tileCoord) ->
    @gl.uniform2fv @u.tileSize, tileSize
    @gl.uniform2fv @u.tileOffset, tileOffset
    @gl.uniform2fv @u.tileCoord, tileCoord
    this

  # set camera perspective
  perspectiveAndScale: (deg, @scale = 1) ->
    # TODO: set min/max based on current scale
    mat4.perspective(deg, @gl.viewportWidth / @gl.viewportHeight, 1.0, 300.0, @pMatrix)
    @gl.uniformMatrix4fv @u.pMatrix, false, @pMatrix

    # this ensures that an object of maximum height will fit exactly in the screen
    zDistance = -@gl.viewportHeight / (2 * @scale)
    mat4.identity @mvMatrix
    mat4.translate @mvMatrix, [-@gl.viewportWidth / (2 * @scale), zDistance, zDistance]
    @gl.uniformMatrix4fv @u.mvMatrix, false, @mvMatrix
    this

  # location to draw next texture, from bottom left
  drawAt: (x, y) ->
    @gl.uniform3f @u.position, x, y, 0
    this

  # set up initial gl options for the webgl canvas context
  glOptions: ->
    @gl.clearColor 0.0, 0.0, 0.0, 1.0 # clear black
    @gl.blendFunc @gl.SRC_ALPHA, @gl.ONE
    @gl.enable @gl.BLEND
    @gl.enable @gl.DEPTH_TEST
    @gl.viewport 0, 0, @gl.viewportWidth, @gl.viewportHeight
    this

  # link gl program and then grab pointers to all uniforms and attributes
  link: ->
    do @_attachSpriteFragmentShader
    do @_attachSpriteVertexShader
    do @parent
    @_attribVertices "vertexPosition", "textureCoord"
    @_uniforms "tileSize", "tileOffset", "tileCoord", "sampler",
               "pMatrix", "mvMatrix", "position"
    this
}
# vim:ts=2 sw=2
