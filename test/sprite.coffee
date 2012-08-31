# resource loader
resources = new cc.Resources

MAX_IMPOSTORS = 20
MAX_FRIENDS = 5

Game = cc.Game.extend {
  # setting overrides used as configuration
  backgroundColor: [1.0, 0.72, 0.0, 1.0]
  gravity: { x: 0, y: 20 }

  surfaceSheet: resources.spriteSheet 'surfaces.png', 64, 64

  autopilot: false # custom setting for this game

  # called after all resources have loaded
  booted: ->
    @input.fallthrough = true # allow e.g. error console shortcut

    @input.bind cc.key.z,     'left'
    @input.bind cc.key.z,     'left'
    @input.bind cc.key.left,  'left'
    @input.bind cc.key.c,     'right'
    @input.bind cc.key.right, 'right'
    @input.bind cc.key.x,     'jump'
    @input.bind cc.key.up,    'jump'

    @input.bind cc.key.a,     'toggle_autopilot'
    @input.bind cc.key.t,     'toggle_scale'
    @input.bind cc.key.r,     'reload'

    @viewport.setWidth @width * 2

    # ground
    @addSurface @surfaceSheet, 0, 0, @height - 64, @viewport.width, 64
    # left wall
    @addSurface @surfaceSheet, 6, 0, 0, 64, @height - 64, 0.7
    # right wall
    @addSurface @surfaceSheet, 6, @viewport.width - 64, 0, 64, @height - 64, 0.3

    @hero = @spawnEntity HeroEntity, 64, 0

    i = 0
    loop
      @spawnEntity ImpostorEntity, cc.rand(64, @viewport.width - 64),
                                   cc.rand(64, @viewport.height - 64)
      break if ++i is MAX_IMPOSTORS

    i = 0
    loop
      @spawnEntity FriendEntity, cc.rand(64, @viewport.width - 64),
                                 cc.rand(64, @viewport.height - 64)
      break if ++i is MAX_FRIENDS

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
}

game = new Game resources, scale: 1

MyEntity = cc.Entity.extend {
  spriteSheet: resources.spriteSheet 'chars.png', 32, 48
  hitbox: { width: 24, height: 42, offset: { y: 6 } }
}

HeroEntity = MyEntity.extend {
  # TODO: add timer for random velocity
  # define main sprite, with tile width and height
  category: 1
  density: 1
  mask: 2 # what categories this collides with
  init: (game, x, y, settings) ->
    @timer = game.timer 1 # time 1 second of game time
    @parent game, x, y, settings
    @pos.y = 80
    @addSprite 'walk', 0.1, [ 30, 31, 32, 31 ]
    @parent game, x, y, settings

  update: ->
    @game.viewport.scrollTo @pos.x - (160 / @game.scale), @pos.y - 64

    do @parent
    if @game.input.released.toggle_autopilot
      @setV 0, 0

    if @timer.expired()
      # if one second of game time has passed update velocity
      @setV cc.rand(-200, 200), cc.rand(-200, 100) if @game.autopilot
      # setV updates the entities v.x and v.y and marks it to
      # be overridden by the physics thread
      do @timer.reset # rearm the timer for another second

    vY = if @standing and @game.input.pressed.jump then -300 else @v.y

    if @game.input.state.left
      @setV -200, vY
    else if @game.input.state.right
      @setV 200, vY
    else if vY
      @setV @v.x, vY

    return
}

ImpostorEntity = MyEntity.extend {
  # bounciness: 0.7
  density: 0.2
  category: 2
  mask: 1
  init: (game, x, y, settings) ->
    # skip hero init
    @v.x = 20
    @parent game, x, y, settings
    @addSprite 'walk', 0.1, [ 27, 28, 29, 28 ]
}

FriendEntity = MyEntity.extend {
  density: 0.2
  category: 6
  mask: 5
  init: (game, x, y, settings) ->
    @v.x = -20
    @parent game, x, y, settings
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
