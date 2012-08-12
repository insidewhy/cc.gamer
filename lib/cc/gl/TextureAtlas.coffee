# a set of large textures that contains further smaller spritesheets of
# various sizes.
cc.module('cc.gl.TextureAtlas').defines -> @set cc.Class.extend {
  # both width and height must be the same and a power of 2
  # i think up to 4096 should be okay
  init: (@width = 2048, @height = 2048, @maxTextures = 32) ->
    # array of all canvases, one to be loaded per texture
    @_canvases = []
    @_addTexture()
    @textures = []

  _addTexture: ->
    # @_canvas = current canvas
    @_canvas = document.createElement 'canvas'
    @_canvas.width  = @width
    @_canvas.height = @height

    # rows.. each row has a height. each entry is either a canvas
    # or an array of two or more canvases stacked vertically
    @_canvas.rows = [ { height: @height, cells: [ false ] } ]
    @_canvas.colWidth = [ @width ] # just stores the column widths
    @_canvases.push @_canvas

  _nRows: -> @_canvas.rows.length
  _nCols: -> @_canvas.colWidth.length

  # Split a cell, which will cause splitting of all cells in the same column.
  _splitCell: (rowIdx, colIdx, width, height) ->
    row = @_canvas.rows[rowIdx]
    if height < row.height
      # split row in two
      newRow = { height: row.height - height, cells: [] }
      for cell in row.cells
        newRow.cells.push cell
      @_canvas.rows.splice rowIdx + 1, 0, newRow
      row.height = height

    colWidth = @_canvas.colWidth[colIdx]
    if width < colWidth
      @_canvas.colWidth.splice colIdx + 1, 0, colWidth - width
      # split column in two
      for row in @_canvas.rows
        row.cells.splice colIdx + 1, 0, row.cells[colIdx]
      @_canvas.colWidth[colIdx] = width


  # return true if empty cells adjactent to rowIdx, colIdx can accomodate box of
  # width and height.
  # TODO: return score which algorithm can use to check best placement
  _searchCells: (firstRow, rowIdx, colIdx, width, height) ->
    # first try to expand over cells to the right
    for lastColIdx in [colIdx...@_canvas.colWidth.length]
      return if firstRow.cells[lastColIdx]
      width -= @_canvas.colWidth[lastColIdx]
      break if width <= 0

    return if width > 0

    for lastRowIdx in [rowIdx...@_canvas.rows.length]
      row = @_canvas.rows[lastRowIdx]
      for cellIdx in [colIdx..lastColIdx]
        return if row.cells[cellIdx]
      height -= row.height
      break if height <= 0

    return if height > 0

    # split last cell
    @_splitCell lastRowIdx, lastColIdx,
                width + @_canvas.colWidth[lastColIdx],
                height + @_canvas.rows[lastRowIdx].height

    # mark all cells as occupied
    for i in [rowIdx..lastRowIdx]
      row = @_canvas.rows[i]
      for cellIdx in [colIdx..lastColIdx]
        row.cells[cellIdx] = true

    return true

  # Look for empty cell. If found in current texture then return it otherwise
  # add new texture and start again.
  # return x/y co-ordinate to draw cell at
  _getCell: (width, height) ->
    x = y = 0
    for rowIdx in [0...@_canvas.rows.length]
      row = @_canvas.rows[rowIdx]
      for colIdx in [0...@_nCols()]
        colWidth = @_canvas.colWidth[colIdx]
        return [ x, y ] if @_searchCells row, rowIdx, colIdx, width, height
        x += colWidth
      y += row.height
      x = 0

    if @_canvases.length >= @maxTextures
      throw "Too many sprite maps for available texture space"

    @_addTexture()
    @_getCell width, height


  addSpriteSheet: (spriteSheet) ->
    img = spriteSheet.image.data

    [x, y] = @_getCell img.width, img.height
    @_canvas.getContext('2d').drawImage img, x, y
    spriteSheet.textureId     = @_canvases.length - 1
    spriteSheet.textureOffset = vec2.createFrom(x / @width, y / @height)

    spriteSheet.textureTileSize =
      vec2.createFrom spriteSheet.tileWidth  / @width,
                      spriteSheet.tileHeight / @height

    return

  # bind image data to texture
  loadToTextures: (gl) ->
    for textureId in [0...@_canvases.length]
      canvas = @_canvases[textureId]
      # no more adding to textures after loading.. so reclaim row metadata
      delete canvas.rows
      delete canvas.colWidth
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
