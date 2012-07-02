# resource loader
resources = new cc.Resources

Game = cc.Game.extend {
  backgroundColor: [1.0, 0.72, 0.0, 1.0] # a nice orange

  # called after all resources have loaded
  booted: ->
    @impostors = [
      # 10, 0, -158
      @spawnEntity ImpostorEntity, 10.0, 0
      @spawnEntity ImpostorEntity, 110, 0
      @spawnEntity ImpostorEntity, 100, 0
      # 140, 0, -128
      @spawnEntity ImpostorEntity, 140, 0 ]

    @hero = @spawnEntity HeroEntity, 0, 0
    return

  # draw: ->
  # update: ->
}

game = new Game resources, scale: 2

HeroEntity = cc.Entity.extend {
  # TODO: add timer for random velocity
  # define main sprite, with tile width and height
  spriteSheet: resources.spriteSheet 'chars.png', 32, 48
  init: (game, x, y, settings) ->
    @parent game, x, y, settings
    @addSprite 'walk', 0.1, [ 30, 31, 32, 31 ]

  update: ->
    do @parent
    if @v.x is 0
      @v.x = 150

    # if at edge then turn back
    maxX = @game.maxX - @width
    if @pos.x > maxX
      @pos.x = maxX
      @v.x = -@v.x
    else if @pos.x < 0
      @pos.x = 0
      @v.x = -@v.x

    maxY = @game.maxY - @height
    if @pos.y > maxY
      @pos.y = maxY
      @v.y = -@v.y
    else if @pos.y < 0
      @pos.y = 0
      @v.y = -@v.y
}

ImpostorEntity = HeroEntity.extend {
  init: (game, x, y, settings) ->
    # skip hero init
    cc.Entity.prototype.init.call this, game, x, y, settings
    @addSprite 'walk', 0.1, [ 27, 28, 29, 28 ]

  update: ->
    cc.Entity.prototype.update.call this
}

window.webGLStart = ->
  # game.main(document.getElementById "game-canvas")
  game.main "#game-canvas"

# vim:ts=2 sw=2
