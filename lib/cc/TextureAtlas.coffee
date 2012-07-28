# a set of large textures that contains further smaller spritesheets of
# various sizes.
cc.module('cc.TextureAtlas').defines -> @set cc.Class.extend {
  # both width and height must be the same and a power of 2
  # i think up to 4096 should be okay
  init: (@width = 2048, @height = 2048, @maxTextures = 32) ->
    # array of all canvases, one to be loaded per texture
    @_canvases = []
    do @_addTexture
    @textures = []

  _addTexture: ->
    # @_canvas = current canvas
    @_canvas = document.createElement 'canvas'
    @_canvas.width  = @width
    @_canvas.height = @height

    # rows.. each row has a height. each entry is either a canvas
    # or an array of two or more canvases stacked vertically
    @_canvas.rows = []
    @_canvases.push @_canvas

  # add a brind new row to the current map
  _addRow: (height) ->
    newRow = {
      height: height
      x: 0 # (x,y) of next cell insert point
      y: 0
      cells: []
    }

    if @_canvas.rows.length
      lastRow = @_canvas.rows[@_canvas.rows.length - 1]
      newRow.textureY = lastRow.textureY + lastRow.height
      if newRow.textureY + newRow.height > @height
        do @_addTexture
        newRow.textureY = 0
    else
      newRow.textureY = 0

    @_canvas.rows.push newRow
    newRow

  _getRowFor: (width, height) ->
    # TODO: find space for cell before adding new
    @_addRow height

  addSpriteSheet: (spriteSheet) ->
    img = spriteSheet.image.data

    row = @_getRowFor img.width, img.height
    textureY = row.textureY + row.y
    @_canvas.getContext('2d').drawImage(img, row.x, textureY)
    spriteSheet.textureId     = @_canvases.length - 1
    spriteSheet.textureOffset = vec2.createFrom((row.x + 0.5) / @width,
                                                (textureY + 0.5) / @height)

    spriteSheet.textureTileSize =
      vec2.createFrom spriteSheet.tileWidth  / @width,
                      spriteSheet.tileHeight / @height

    # update row metadata
    row.x += img.width
    if img.height < row.height
      row.y += img.height

    return

  # bind image data to texture
  loadToTextures: (gl) ->
    for textureId in [0...@_canvases.length]
      canvas = @_canvases[textureId]
      # no more adding to textures after loading.. so reclaim row metadata
      delete canvas.rows
      glTexture = gl.createTexture()
      @textures.push glTexture
      glTexture.idx = textureId
      glTexture.id = gl['TEXTURE' + textureId]
      gl.bindTexture gl.TEXTURE_2D, glTexture
      gl.pixelStorei gl.UNPACK_FLIP_Y_WEBGL, true
      gl.texImage2D gl.TEXTURE_2D, textureId, gl.RGBA, gl.RGBA,
                    gl.UNSIGNED_BYTE, canvas
      gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST
      gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST
      gl.bindTexture gl.TEXTURE_2D, null
    return

}
# vim:ts=2 sw=2
