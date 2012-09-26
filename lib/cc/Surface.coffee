cc.module('cc.Surface').defines -> @set cc.Class.extend {
  tile: null

  # not to be called externally!! use Game.addSurface
  init: (@game, @sheet, tileIdx, @x, @y, @width,
         @height, @friction = 0, @bounciness = 0) ->
    nCols = @sheet.imgWidth() / @sheet.tileWidth
    @tile = vec2.createFrom(tileIdx % nCols, Math.floor(tileIdx / nCols))
    @_tileRepeat =
      vec2.createFrom(@width / @sheet.tileWidth, @height / @sheet.tileHeight)

  compressedPhysics: -> [ 'S', @x, @y, @width, @height, @friction, @bounciness ]

  draw: ->
    @game.renderer.setSize @width, @height
    @game.renderer.selectSprite this
    @game.renderer.tileRepeat @_tileRepeat
    @game.renderer.drawSurface @x, @y, @z or 0
}
# vim:ts=2 sw=2
