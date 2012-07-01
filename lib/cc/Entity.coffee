cc.module('cc.Entity').defines -> @set cc.Class.extend {
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
  addSprite: (name, frameLength, frames) ->
    @sprites[name] = sprite = new cc.Sprite @spriteSheet, frameLength, frames
    @setSprite name if not @activeSprite
    sprite

  update: ->
    do @activeSprite.update
    return

  draw: ->

}
# vim:ts=2 sw=2
