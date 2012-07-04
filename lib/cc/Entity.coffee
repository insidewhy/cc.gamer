cc.module('cc.Entity').defines -> @set cc.Class.extend {
  width: 0
  height:0
  sprites: {}
  # pos: { x: 0, y: 0, z: 0 } # position
  v:    { x: 0, y: 0 }        # velocity
  maxV: { x: 200, y: 100 } # maximum velocity
  a:    { x: 0, y: 0 }     # acceleration
  sprite: null         # currently displayed sprite
  # spriteSheet: null  # must be defined in deriving class

  # not to be called externally!! use Game.spawnEntity
  init: (@game, x, y, settings) ->
    @pos = x: x, y: y, z: 0
    return

  # set current active sprite
  setSprite: (name) ->
    @sprite = @sprites[name]
    @sprite.timer = new cc.Timer @game
    @sprite.timer.expiresIn @sprite.frameLength
    @sprite

  # name of sprite, length of frame, indexes of frames in sprite
  # if the entity width/height are not set they are taken from the
  # spritesheet
  addSprite: (name, frameLength, frames) ->
    @sprites[name] = sprite = new cc.Sprite @spriteSheet, frameLength, frames
    if not @sprite
      @setSprite name
      if not @width
        @width = sprite.sheet.tileWidth
      if not @height
        @height = sprite.sheet.tileHeight

    sprite

  update: ->
    # TODO: increase v by acceleration up to maxV
    @pos.x += @v.x * @game.tick if @v.x
    @pos.y += @v.y * @game.tick if @v.y
    do @sprite.update if @sprite
    return

  draw: ->
    # @game.renderer.shdr.setTileSize @sprite.width, @sprite.height
    @game.renderer.shdr.setTileSize @width, @height
    @game.renderer.selectSprite @sprite
    @game.renderer.drawSprite @pos.x, @pos.y, @pos.z, @v.x < 0
    return

}
# vim:ts=2 sw=2
