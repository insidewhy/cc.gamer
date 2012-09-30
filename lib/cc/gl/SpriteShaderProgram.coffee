cc.module('cc.gl.SpriteShaderProgram').parent('cc.gl.ShaderProgram').jClass {
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

  setSize: (width, height) ->
    @gl.uniform2f @u.size, width, height
    return

  _attachSpriteFragmentShader: ->
    content = """
      precision mediump float;

      varying vec2 vTextureCoord;
      uniform int mode;

      // for mode 1
      uniform bool flipX;

      // for modes 1 and 2
      uniform sampler2D sampler;
      uniform vec2 tileSize;   // tile size in percentage of texture size
      uniform vec2 tileOffset; // index of tile e.g. (1,1) = (1 down, 1 right)
      uniform vec2 tileCoord;  // offset into texture of first pixel

      // for mode 2
      uniform vec2 tileRepeat;

      // for mode 3
      uniform vec4 color;

      // opacity, currently only affects mode 1
      uniform float opacity;

      // this converts the tile coordinate system to the gl coordinate system
      // First it flips the y-axis. Then it reverses the direction it scans
      // for the current pixel. It also has to add one to the y-offset to make
      // up for it being from the top left rather than the bottom right.
      void main(void) {
        vec2 _tileOffset = vec2(tileOffset.s, tileOffset.t + 1.0);
        vec2 _texCoord   = vec2(vTextureCoord.s, -vTextureCoord.t);

        if (mode == 1) {
          if (flipX) {
            _texCoord.s = -_texCoord.s;
            _tileOffset.s += 1.0;
          }

          gl_FragColor = texture2D(sampler,
            vec2(1, -1) * (
              (_texCoord * tileSize) + (tileSize * _tileOffset) + tileCoord));

          gl_FragColor.a *= opacity;
        }
        else if (mode == 2) {
          _texCoord.s = mod(_texCoord.s * tileRepeat.s, 1.0);
          _texCoord.t = -mod(-_texCoord.t * tileRepeat.t, 1.0);

          gl_FragColor = texture2D(sampler,
            vec2(1, -1) * (
              (_texCoord * tileSize) + (tileSize * _tileOffset) + tileCoord));
        }
        else if (mode == 3) {
          gl_FragColor = color;
        }
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

        // size of sprite/surface
        uniform vec2 size;

        // to project y onto x.. multiply position by this
        // const mat3 shear = mat3(1,0,0, 0,0,1, 0,-1,0);

        varying vec2 vTextureCoord;

        void main(void) {
          gl_Position = pMatrix * mvMatrix *
            vec4(
              vec3(size, 1.0) * vertexPosition +
                vec3(position.x, -position.y - size.y, position.z),
              1.0);
          vTextureCoord = textureCoord;
        }"""
    shader = @gl.createShader @gl.VERTEX_SHADER
    @_attachShader shader, content

  # tileSize (units is percentage of texture size, entire texture = [1,1])
  # tileOffset from top left at [0, 0]
  # sheetOffset in texture coordinates: [0->1, 0->1]
  selectTile: (tileSize, tileOffset, sheetOffset) ->
    @gl.uniform2fv @u.tileSize, tileSize
    @gl.uniform2fv @u.tileOffset, tileOffset
    @gl.uniform2fv @u.tileCoord, sheetOffset
    return

  tileRepeat: (r) ->
    @gl.uniform2fv @u.tileRepeat, r
    return

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

  modeDynamicEntity: ->
    @gl.uniform1i @u.mode, 1
    return

  modeSurfaceEntity: ->
    @gl.uniform1i @u.mode, 2
    return

  modeColor: ->
    @gl.uniform1i @u.mode, 3
    return

  setColor: (color) ->
    @gl.uniform4fv @u.color, color

  setOpacity: (opacity) ->
    @gl.uniform1f @u.opacity, opacity

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

    @_attachSpriteFragmentShader()
    @_attachSpriteVertexShader()
    @parent()
    @_attribVertices "vertexPosition", "textureCoord"
    @_uniforms "mode", "flipX", "sampler",
               "tileSize", "tileOffset", "tileCoord", "tileRepeat",
               "color", "opacity", # from here is shader
               "mvMatrix", "pMatrix", "position",
               "size"

    @_glOptions()

    # send shape to vertex
    @gl.bindBuffer @gl.ARRAY_BUFFER, @spriteVertices
    @gl.vertexAttribPointer @a.vertexPosition,
      @spriteVertices.itemSize, @gl.FLOAT, false, 0, 0

    # default opacity
    @setOpacity 1

    this
}
# vim:ts=2 sw=2
