# a large texture that contains further smaller spritesheets of various sizes.
cc.module('cc.TextureAtlas').defines -> @set cc.Class.extend {
  # both width and height must be the same and a power of 2
  # i think up to 4096 should be okay
  init: (@width = 2048, @height = 2048) ->
    @_canvas = document.createElement 'canvas'
    @_canvas.width = @width
    @_canvas.height = @height

  addSpriteSheet: (spriteSheet) ->
    # TODO: place intelligently and update spriteSheet object
    # current mess: just overwrites data at top
    @_canvas.getContext('2d').drawImage(spriteSheet.image.data, 0, 0)
    return

  # bind image data to texture
  loadImageToTexture: (gl, textureId = 0) ->
    @glTexture = gl.createTexture()
    gl.bindTexture gl.TEXTURE_2D, @glTexture
    gl.pixelStorei gl.UNPACK_FLIP_Y_WEBGL, true
    gl.texImage2D gl.TEXTURE_2D, textureId, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, @_canvas
    gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST
    gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST
    gl.bindTexture gl.TEXTURE_2D, null
    return

}
# vim:ts=2 sw=2
