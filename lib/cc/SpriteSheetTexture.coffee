# a sprite texture is a large texture that contains further smaller
# spritesheets of various sizes.
cc.module('cc.SpriteSheetTexture').defines -> @set cc.Class.extend {
  # both width and height must be the same and a power of 2
  # i think up to 4096 should be okay
  init: (@width = 2048, @height = 2048) ->
    @_canvas = document.createElement 'canvas'
    @_canvas.width = @width
    @_canvas.height = @height

  addImage: (data) ->
    # TODO: place intelligently and return position data
    # current mess: just overwrites whatever is at the bottom
    @_canvas.getContext('2d').drawImage(data, 0, @height - data.height)

  # bind image data to texture
  bindTexture: (gl, textureId = 0) ->
    @glTexture = gl.createTexture()
    gl.bindTexture gl.TEXTURE_2D, @glTexture
    gl.pixelStorei gl.UNPACK_FLIP_Y_WEBGL, true
    gl.texImage2D gl.TEXTURE_2D, textureId, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, @_canvas
    gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST
    gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST
    gl.bindTexture gl.TEXTURE_2D, null

}
# vim:ts=2 sw=2
