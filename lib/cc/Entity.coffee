cc.module('cc.Entity').parent('cc.physics.Entity').jClass {
  sprites: {}
  sprite: null         # currently displayed sprite
  category: 1 # mask defining what can collide with this
  mask: 1     # mask defining what this can collide with
  # spriteSheet: null  # must be defined in deriving class

  # not to be called externally!! use Game.spawnEntity
  init: (@game, x, y, settings) ->
    @_setPos x, y
    # does not call parent.. only sets x and y the rest come from the
    # physics client
    return

  # set current active sprite
  setSprite: (name) ->
    @sprite = @sprites[name]
    @sprite.timer = new cc.Timer @game
    @sprite.timer.setDuration @sprite.frameLength
    @sprite

  # name of sprite, length of frame, indexes of frames in sprite
  # if the entity width/height are not set they are taken from the
  # first added sprite
  addSprite: (name, frameLength, frames) ->
    @sprites[name] = sprite = new cc.Sprite @spriteSheet, frameLength, frames
    if not @sprite
      @setSprite name
      return if @width and @height

      if not @width
        @width = sprite.sheet.tileWidth
      if not @height
        @height = sprite.sheet.tileHeight

      if @hitbox
        @hitbox.offset = {} unless @hitbox.offset
        if not @hitbox.offset.x
          @hitbox.offset.x = Math.ceil((@width - @hitbox.width) / 2)
        if not @hitbox.offset.y
          @hitbox.offset.y = Math.ceil((@height - @hitbox.height) / 2)

    sprite

  update: ->
    @_step @game.tick unless @game.useWebWorker
    do @sprite.update if @sprite
    return

  # mark that physics have changed and need to be sent back to physics worker
  # if you don't call this after overriding or changing properties manually
  # then the web worker thread will miss them
  mark: ->
    @game._hasUpdateEntities = true
    @game._updateEntities[@id] = this

  setV: (vx, vy) ->
    @v.x = vx
    @v.y = vy
    do @mark

  setPos: (px, py) ->
    @pos.x = px
    @pos.y = py
    do @mark

  draw: ->
    # @game.renderer.shdr.setTileSize @sprite.width, @sprite.height
    @game.renderer.shdr.setTileSize @width, @height
    @game.renderer.selectSprite @sprite
    @game.renderer.drawSprite @pos.x, @pos.y, @pos.z, @v.x < 0
    return

}
# vim:ts=2 sw=2
