cc.module('cc.Game').requires('cc.Timer').defines -> @set cc.Class.extend {
  now: 0        # current game world time
  entities: []      # all alive entities in this game
  entitiesById: {}  # same as above but hashed by id
  _newEntities: {}  # entities that haven't been sent to the physics worker
  maxTick: 0.05 # slow time down if tick falls below this
  scale: 1      # zoom
  maxX: 0       # max x-pixel TODO: move to Viewport class?
  maxY: 0       # max y-pixel
  box2dScale: 30 # how much to scale pixels down by for box2d
  entityCount: 0 # counter used to generate id for each entity
  renderer : null
  backgroundColor: [0.0, 0.0, 0.0, 1.0] # default background colour

  # dimensions in pixels, 0 = unset
  width: 0
  height: 0

  # options are optional, @resources is the resource loader
  init: (@resources, options) ->
    @physicsClient = new cc.PhysicsClient @box2dScale, => do @update
    @setOptions options

  setOptions: (options) ->
    return unless options
    @scale = options.scale if options.scale
    @maxTick = options.maxTick if options.maxTick
    @width = options.width if options.width
    @height = options.height if options.height

  # create a new timer referencing this game's time
  # expiresIn: optional expiry time in seconds
  timer: (expiresIn) ->
    new cc.Timer(this, expiresIn)

  main: (canvas, options) ->
    @setOptions options
    if not canvas.getContext?
      if not (typeof canvas is "string")
        throw 'canvas argument must be Canvas object or selector'

      if canvas[0] == '#'
        canvas = document.getElementById canvas[1..]
      else
        canvas = document.getElementById canvas

    throw "could not find canvas" unless canvas.getContext?

    @resources.onLoadStatusUpdate (cmplt) =>
      if cmplt < 1
        # TODO: update loading screen if there is one
        return

      @width  = canvas.width unless @width
      @height = canvas.height unless @height

      try
        gl = cc.initGL canvas, @width, @height
        @renderer = new cc.Renderer gl, @scale, @resources

        @maxX = gl.viewportWidth / @scale
        @maxY = gl.viewportHeight / @scale
      catch e
        # TODO: fall back on canvas if there is no open GL
        alert "sorry WebGL is not enabled/supported in your browser, please try Firefox or Chrome"
        return

      c = @backgroundColor
      @renderer.setBackgroundColor c[0], c[1], c[2], c[3]
      do @booted if @booted

      # @now = virtual time, now = time
      # virtual time starts at 0
      # it starts off as a constant offset to real time but will lag if
      # any frame is delayed by more than @maxTick
      @now = 0
      now = new Date().getTime() / 1000

      do @physicsClient.run
      @physicsClient.sendNewEntities @_newEntities
      @_newEntities = {}

      do mainLoop = =>
        do @physicsClient.signalPaint
        cc.requestAnimationFrame mainLoop

        newNow = new Date().getTime() / 1000
        @tick = newNow - now
        @tick = @maxTick if @tick > @maxTick # slow down time if necessary
        @now += @tick
        now = newNow
        # do @update # done by worker thread
        do @draw

      return

  spawnEntity: (type, x, y, settings) ->
    entity = new (type)(this, x, y, settings)
    entity.id = ++@entityCount
    @entities.push entity
    @entitiesById[entity.id] = @_newEntities[entity.id] = entity

  update: ->
    # TODO: ordering, collision checking
    do entity.update for entity in @entities

  draw: ->
    do @renderer.clear
    # TODO: draw backgrounds here
    do entity.draw for entity in @entities
}
# vim:ts=2 sw=2
