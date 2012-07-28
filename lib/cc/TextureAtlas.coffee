# a set of large textures that contains further smaller spritesheets of
# various sizes.
cc.module('cc.TextureAtlas').defines -> @set cc.Class.extend {
  # both width and height must be the same and a power of 2
  # i think up to 4096 should be okay
  init: (@width = 2048, @height = 2048, @maxTextures = 32) ->
    # @_canvas = current canvas
    @_canvas = document.createElement 'canvas'
    @_canvas.width  = @width
    @_canvas.height = @height

    # array of all canvases, one to be loaded per texture
    @_canvases = [ @_canvas ]
    @textures = []

  addSpriteSheet: (spriteSheet) ->
    # TODO: place intelligently and update spriteSheet object
    # current mess: just overwrites data at top
    x = y = 0
    img = spriteSheet.image.data
    @_canvas.getContext('2d').drawImage(img, x, y)

    spriteSheet.textureId     = @_canvases.length - 1
    spriteSheet.textureOffset = vec2.createFrom((x + 0.5) / @width, (y + 0.5) / @height)
    spriteSheet.textureTileSize =
      vec2.createFrom spriteSheet.tileWidth  / @width,
                      spriteSheet.tileHeight / @height

    return

  # bind image data to texture
  loadToTextures: (gl) ->
    for textureId in [0...@_canvases.length]
      glTexture = gl.createTexture()
      @textures.push glTexture
      glTexture.idx = textureId
      glTexture.id = gl['TEXTURE' + textureId]
      gl.bindTexture gl.TEXTURE_2D, glTexture
      gl.pixelStorei gl.UNPACK_FLIP_Y_WEBGL, true
      gl.texImage2D gl.TEXTURE_2D, textureId, gl.RGBA, gl.RGBA,
                    gl.UNSIGNED_BYTE, @_canvases[textureId]
      gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST
      gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST
      gl.bindTexture gl.TEXTURE_2D, null
    return

}
# vim:ts=2 sw=2
