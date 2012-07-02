cc.module('cc.Entity').defines -> @set cc.Class.extend {
  width: 0
  height:0
  sprites: {}
  sprite: null         # currently displayed sprite
  # spriteSheet: null  # must be defined in deriving class

  # not to be called externally!! use Game.spawnEntity
  init: (@game, x, y, settings) ->
    @pos = x: x, y: y
    return

  # set current active sprite
  setSprite: (name) ->
    @sprite = @sprites[name]
    @sprite.timer = new cc.Timer @game
    @sprite.timer.expiresIn @sprite.frameLength
    @sprite

  # name of sprite, length of frame, indexes of frames in sprite
  # if the sprite width/height are not set they are taken from the
  # spritesheet
  addSprite: (name, frameLength, frames) ->
    @sprites[name] = sprite = new cc.Sprite @spriteSheet, frameLength, frames
    @setSprite name if not @sprite
    if not @width
      @width = sprite.sheet.tileWidth
    if not @height
      @height = sprite.sheet.tileHeight

    sprite

  update: ->
    do @sprite.update
    return

  draw: ->
    # @game.renderer.shdr.setTileSize @sprite.width, @sprite.height
    @game.renderer.shdr.setTileSize @width, @height
    @game.renderer.selectSprite @sprite
    @game.renderer.drawSprite @pos.x, @pos.y, 0.0
    return

}
# vim:ts=2 sw=2
