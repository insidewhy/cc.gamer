cc.module('cc.Image').defines -> @set cc.Class.extend {
  # supply with DOM Image object
  # not to be called externally!! use Resources
  init: (path, onload) ->
    @data = new window.Image
    @data.onload = onload
    @data.src = path

  # TODO
  draw: (x, y) ->
  drawTile: (x, y, tileN, tileSize) ->
}
