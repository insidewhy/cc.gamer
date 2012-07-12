# resource loader
resources = new cc.Resources

Game = cc.Game.extend {
  # setting overrides used as configuration
  backgroundColor: [1.0, 0.72, 0.0, 1.0]
  gravity: { x: 0, y: 2 }

  autopilot: false # custom setting for this game

  # called after all resources have loaded
  booted: ->
    @input.fallthrough = true # allow e.g. error console shortcut

    @input.bind cc.key.z,     'left'
    @input.bind cc.key.z,     'left'
    @input.bind cc.key.left,  'left'
    @input.bind cc.key.c,     'right'
    @input.bind cc.key.right, 'right'
    @input.bind cc.key.x,     'down'
    @input.bind cc.key.down,  'down'
    @input.bind cc.key.s,     'up'
    @input.bind cc.key.up,    'up'

    @input.bind cc.key.a,     'toggle_autopilot'
    @input.bind cc.key.t,     'toggle_scale'
    @input.bind cc.key.r,     'reload'

    i = 0
    loop
      @spawnEntity ImpostorEntity, cc.rand(0, 300), cc.rand(0, 300)
      break if ++i > 40

    i = 0
    loop
      @spawnEntity FriendEntity, cc.rand(0, 300), cc.rand(0, 300)
      break if ++i > 10

    @hero = @spawnEntity HeroEntity, 0, 0
    return

  update: ->
    if @input.pressed.reload
      document.location.reload true

    if @input.pressed.toggle_scale
      @setScale if @scale == 2 then 1 else 2

    if @input.pressed.toggle_autopilot
      @autopilot = ! @autopilot

    do @parent

  # draw: ->
  # update: ->
}

game = new Game resources, scale: 1

HeroEntity = cc.Entity.extend {
  # TODO: add timer for random velocity
  # define main sprite, with tile width and height
  bounciness: 0.5
  category: 1
  density: 2
  mask: 2 # what categories this collides with
  spriteSheet: resources.spriteSheet 'chars.png', 32, 48
  hitbox: { width: 24, height: 40 }
  init: (game, x, y, settings) ->
    @timer = game.timer 1 # time 1 second of game time
    @parent game, x, y, settings
    @pos.y = 80
    @addSprite 'walk', 0.1, [ 30, 31, 32, 31 ]

  update: ->
    do @parent
    if @game.input.released.toggle_autopilot
      @setV 0, 0

    if @timer.expired()
      # if one second of game time has passed update velocity
      @setV cc.rand(-200, 200), cc.rand(-200, 100) if @game.autopilot
      # setV updates the entities v.x and v.y and marks it to
      # be overridden by the physics thread
      do @timer.reset # rearm the timer for another second

    if @game.input.state.left
      @setV -200, 0
    else if @game.input.state.right
      @setV 200, 0
    else if @game.input.state.up
      @setV 0, -200
    else if @game.input.state.down
      @setV 0, 200

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
  density: 0
  category: 2
  mask: 1
  init: (game, x, y, settings) ->
    # skip hero init
    @v.x = 20
    cc.Entity.prototype.init.call this, game, x, y, settings
    @addSprite 'walk', 0.1, [ 27, 28, 29, 28 ]

  update: ->
    cc.Entity.prototype.update.call this
    do @_keepInView
}

FriendEntity = ImpostorEntity.extend {
  category: 6
  mask: 5
  init: (game, x, y, settings) ->
    @v.x = -20
    cc.Entity.prototype.init.call this, game, x, y, settings
    @addSprite 'walk', 0.1, [ 81, 82, 83, 82 ]
}

window.webGLStart = ->
  # game.main(document.getElementById "game-canvas")
  cons = document.getElementById 'console'
  cons.innerHTML = 0
  now = new Date().getTime()
  setInterval(
    ->
      _now = new Date().getTime()
      cons.innerHTML = (Math.floor game.ticks / ((_now - now) / 1000)) + " : " + game.updates + " : " + game.skips
      now = _now
      game.ticks = game.skips = game.updates = 0
    1000)
  game.main "#game-canvas"

# vim:ts=2 sw=2
