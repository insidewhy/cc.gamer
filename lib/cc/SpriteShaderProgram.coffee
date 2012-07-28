cc.module('cc.SpriteShaderProgram').parent('cc.ShaderProgram').jClass {
  gl: null
  scale: 1

  init: ->
    do @parent
    @pMatrix = mat4.create()
    @mvMatrix = mat4.create() # reference point at bottom left corner of screen
    return

  activateTexture: (texture) ->
    @gl.bindBuffer @gl.ARRAY_BUFFER, @textureBuffer
    @gl.vertexAttribPointer @a.textureCoord, @textureBuffer.itemSize, @gl.FLOAT, false, 0, 0
    # id and idx fields are added to the texture by cc.gamer
    @gl.activeTexture texture.id
    @gl.bindTexture @gl.TEXTURE_2D, texture
    @gl.uniform1i @u.sampler, texture.idx
    this

  setTileSize: (width, height) ->
    @gl.uniform2f @u.spriteSize, width, height
    return

  _attachSpriteFragmentShader: ->
    content = """
      precision mediump float;

      varying vec2 vTextureCoord;

      uniform vec2 tileSize;   // tile size in percentage of texture size
      uniform vec2 tileOffset; // index of tile e.g. (1,1) = (1 down, 1 right)
      uniform vec2 tileCoord;  // offset into texture of first pixel
      uniform sampler2D sampler;

      uniform bool flipX;

      // this converts the tile coordinate system to the gl coordinate system
      // First it flips the y-axis. Then it reverses the direction it scans
      // for the current pixel. It also has to add one to the y-offset to make
      // up for it being from the top left rather than the bottom right.
      void main(void) {
        vec2 _tileOffset = vec2(tileOffset.s, tileOffset.t + 1.0);
        vec2 _texCoord   = vec2(vTextureCoord.s, -vTextureCoord.t);
        if (flipX) {
          _texCoord.s = -_texCoord.s;
          _tileOffset.s += 1.0;
        }

        float offset = 1.0;

        gl_FragColor = texture2D(sampler,
          vec2(1, -1) * (
            (_texCoord * tileSize) + (tileSize * _tileOffset) + tileCoord));
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

        uniform vec2 spriteSize;

        // to project y onto x.. multiply position by this
        // const mat3 shear = mat3(1,0,0, 0,0,1, 0,-1,0);

        varying vec2 vTextureCoord;

        void main(void) {
          gl_Position = pMatrix * mvMatrix *
            vec4(
              vec3(spriteSize, 1.0) * vertexPosition +
                vec3(position.x, -position.y - spriteSize.y, position.z),
              1.0);
          vTextureCoord = textureCoord;
        }"""
    shader = @gl.createShader @gl.VERTEX_SHADER
    @_attachShader shader, content

  # tileSize units is percentage of texture size
  # tileOffset from top left at [0, 0]
  # sheetOffset in texture coordinates: [0->1, 0->1]
  selectTile: (tileSize, tileOffset, sheetOffset) ->
    @gl.uniform2fv @u.tileSize, tileSize
    @gl.uniform2fv @u.tileOffset, tileOffset
    @gl.uniform2fv @u.tileCoord, sheetOffset
    this

  # set camera perspective
  perspectiveAndScale: (deg, @scale = 1) ->
    # TODO: set min/max based on current scale
    mat4.perspective(deg, @gl.viewportWidth / @gl.viewportHeight, 1.0, 300.0, @pMatrix)
    @gl.uniformMatrix4fv @u.pMatrix, false, @pMatrix

    # this ensures that an object of maximum height will fit exactly in the screen
    zDistance = -@gl.viewportHeight / (2 * @scale)

    # points mvMatrix at top left corner at z-distance 0
    mat4.identity @mvMatrix
    mat4.translate @mvMatrix, [-@gl.viewportWidth / (2 * @scale), -zDistance, zDistance]

    @gl.uniformMatrix4fv @u.mvMatrix, false, @mvMatrix
    this

  # location to draw next texture, from bottom left
  drawAt: (x, y, z = 0) ->
    @gl.uniform3f @u.position, x, y, z
    this

  flipX: (flip) ->
    @gl.uniform1i @u.flipX, flip
    this

  clearColor: (r, g, b, a) ->
    @gl.clearColor r, g, b, a
    return

  # set up initial gl options for the webgl canvas context
  _glOptions: ->
    # this combination of options puts newly drawn items on top so objects
    # should be drawn further first
    @gl.enable @gl.BLEND
    @gl.blendFunc @gl.SRC_ALPHA, @gl.ONE_MINUS_SRC_ALPHA
    @gl.disable @gl.DEPTH_TEST
    @gl.viewport 0, 0, @gl.viewportWidth, @gl.viewportHeight
    return

  # link gl program and then grab pointers to all uniforms and attributes
  link: ->
    # this is the standard texture used to draw pretty much all sprites
    @textureBuffer = @gl.createBuffer()
    @gl.bindBuffer @gl.ARRAY_BUFFER, @textureBuffer
    textureCoords = [
      1.0, 1.0,
      0.0, 1.0,
      1.0, 0.0,
      0.0, 0.0 ]
    @gl.bufferData @gl.ARRAY_BUFFER, new Float32Array(textureCoords), @gl.STATIC_DRAW
    @textureBuffer.itemSize = 2
    @textureBuffer.numItems = 4

    # create the tile used for all square sprites
    @spriteVertices = @gl.createBuffer()
    @gl.bindBuffer @gl.ARRAY_BUFFER, @spriteVertices

    # bottom left corner of sprite at center of mvMatrix
    vertices = [
      1.0, 1.0, 0.0,
      0.0, 1.0, 0.0,
      1.0, 0.0, 0.0,
      0.0, 0.0, 0.0 ]
    @gl.bufferData @gl.ARRAY_BUFFER, new Float32Array(vertices), @gl.STATIC_DRAW
    @spriteVertices.itemSize = 3
    @spriteVertices.numItems = 4

    do @_attachSpriteFragmentShader
    do @_attachSpriteVertexShader
    do @parent
    @_attribVertices "vertexPosition", "textureCoord"
    @_uniforms "tileSize", "tileOffset", "tileCoord", "sampler",
               "pMatrix", "mvMatrix", "position",
               "spriteSize", "flipX"

    do @_glOptions

    # send shape to vertex
    @gl.bindBuffer @gl.ARRAY_BUFFER, @spriteVertices
    @gl.vertexAttribPointer @a.vertexPosition,
      @spriteVertices.itemSize, @gl.FLOAT, false, 0, 0

    this
}
# vim:ts=2 sw=2
