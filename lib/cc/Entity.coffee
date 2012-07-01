cc.module('cc.Entity').defines -> @set cc.Class.extend {
  width: 0
  height:0
  sprites: {}
  activeSprite: null # you must define this in the over-riding class
  # spriteSheet: null  # must be defined in deriving class

  # not to be called externally!! use Game.spawnEntity
  init: (@game, x, y, settings) ->
    @pos = x: x, y: y
    return

  # set current active sprite
  setSprite: (name) ->
    @activeSprite = @sprites[name]
    @activeSprite.timer = new cc.Timer @game
    @activeSprite.timer.expiresIn @activeSprite.frameLength
    @activeSprite

  # name of sprite, length of frame, indexes of frames in sprite
  # if the sprite width/height are not set they are taken from the
  # spritesheet
  addSprite: (name, frameLength, frames) ->
    @sprites[name] = sprite = new cc.Sprite @spriteSheet, frameLength, frames
    @setSprite name if not @activeSprite
    if not @width
      @width = sprite.sheet.tileWidth
    if not @height
      @height = sprite.sheet.tileHeight

    sprite

  update: ->
    do @activeSprite.update
    return

  draw: ->

}
# vim:ts=2 sw=2
