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
    @v.x = 150
    @timer = game.timer 1 # time 1 second of game time
    @parent game, x, y, settings
    @addSprite 'walk', 0.1, [ 30, 31, 32, 31 ]

  update: ->
    do @parent
    if @timer.expired()
      # if one second of game time has passed
      @v.x = cc.rand -300, 300
      @v.y = cc.rand -75, 75
      do @timer.reset # then reset the timer

    do @_keepInView

  _keepInView: ->
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
    @v.x = 20
    cc.Entity.prototype.init.call this, game, x, y, settings
    @addSprite 'walk', 0.1, [ 27, 28, 29, 28 ]

  update: ->
    cc.Entity.prototype.update.call this
    do @_keepInView

}

window.webGLStart = ->
  # game.main(document.getElementById "game-canvas")
  game.main "#game-canvas"

# vim:ts=2 sw=2
