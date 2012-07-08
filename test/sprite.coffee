# resource loader
resources = new cc.Resources

Game = cc.Game.extend {
  backgroundColor: [1.0, 0.72, 0.0, 1.0] # a nice orange
  gravity: { x: 0, y: 2 }

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
  category: 1,
  mask: 2, # what categories this collides with
  spriteSheet: resources.spriteSheet 'chars.png', 32, 48
  hitbox: { width: 24, height: 40 }
  init: (game, x, y, settings) ->
    @v.x = 150
    @v.y = -100
    @timer = game.timer 1 # time 1 second of game time
    @parent game, x, y, settings
    @pos.y = 80
    @addSprite 'walk', 0.1, [ 30, 31, 32, 31 ]

  update: ->
    do @parent
    if @timer.expired()
      # if one second of game time has passed update velocity
      @setV cc.rand(-200, 200), cc.rand(0, 200)
      # setV updates the entities v.x and v.y and marks it to
      # be overridden by the physics thread
      do @timer.reset # rearm the timer for another second

    do @_keepInView

  _keepInView: ->
    # if at edge then turn back
    # TODO: do this in engine with some kinda bounciness factor
    maxX = @game.maxX - @width
    if @pos.x > maxX
      @pos.x = maxX
      @v.x = -@v.x unless @v.x < 0
      do @mark # tell worker thread physics have been overridden
    else if @pos.x < -cc.ZERO
      @pos.x = 0
      @v.x = -@v.x unless @v.x > 0
      do @mark

    maxY = @game.maxY - @height
    if @pos.y > maxY # bottom
      @pos.y = maxY
      @v.y = -@v.y unless @v.y < 0
      do @mark
    else if @pos.y < -cc.ZERO # above top
      @pos.y = 0
      @v.y = -@v.y unless @v.y > 0
      do @mark
}

ImpostorEntity = HeroEntity.extend {
  category: 2,
  mask: 1,
  init: (game, x, y, settings) ->
    # skip hero init
    @v.x = 20
    cc.Entity.prototype.init.call this, game, x, y, settings
    @addSprite 'walk', 0.1, [ 27, 28, 29, 28 ]

  update: ->
    cc.Entity.prototype.update.call this
    do @_keepInView
}

cons = null
now = null

window.webGLStart = ->
  # game.main(document.getElementById "game-canvas")
  cons = document.getElementById 'console'
  cons.innerHTML = 0
  now = new Date().getTime()
  setInterval(
    ->
      _now = new Date().getTime()
      cons.innerHTML = Math.floor game.ticks / ((_now - now) / 1000)
      now = _now
      game.ticks = 0
    1000)
  game.main "#game-canvas"

# vim:ts=2 sw=2
