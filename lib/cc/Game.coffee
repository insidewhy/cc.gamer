cc.module('cc.Game').requires('cc.Timer').defines -> @set cc.Class.extend {
  now: 0        # current game world time
  tick: 1       # length of previous frame
  ticks: 0      # the number of ticks that have been rendered
  # tick is set to 0 after each draw to avoid two draws with no output, so
  # it starts at 1 so the first draw can run
  entities: []      # all alive entities in this game
  entitiesById: {}  # same as above but hashed by id
  _updateEntities: {}  # entities that have been updated
  _hasUpdateEntities: false # if _updateEntities has a single entry
  maxTick: 0.05 # slow time down if tick falls below this
  gravity: { x: 0, y: 0 }  # world gravity
  # maxTick must be set before main is called for the physic client to get it
  scale: 1      # zoom
  maxX: 0       # max x-pixel TODO: move to Viewport class?
  maxY: 0       # max y-pixel
  box2dScale: 30 # how much to scale pixels down by for box2d
  entityCount: 0 # counter used to generate id for each entity
  renderer : null
  useWebWorker: true  # whether to use web worker thread.
  # will be set to false by main if it determines workers are not available
  backgroundColor: [0.0, 0.0, 0.0, 1.0] # default background colour

  # dimensions in pixels, 0 = unset
  width: 0
  height: 0

  # options are optional, @resources is the resource loader
  init: (@resources, options) ->
    @physicsClient = new cc.PhysicsClient @box2dScale, (data, tick) =>
      for own id, uent of data
        entity = @entitiesById[id]
        entity.uncompressPhysics uent if entity

      @tick = tick
      @now += tick
      do @update
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

        @maxX = gl.viewportWidth / @scale + cc.ZERO
        @maxY = gl.viewportHeight / @scale + cc.ZERO
      catch e
        # TODO: fall back on canvas if there is no open GL
        alert "sorry WebGL is not enabled/supported in your browser, please try Firefox or Chrome"
        return

      c = @backgroundColor
      @renderer.setBackgroundColor c[0], c[1], c[2], c[3]
      do @booted if @booted

      do @physicsClient.run
      @physicsClient.sendConfig maxTick: @maxTick, gravity: @gravity
      @physicsClient.sendEntities @_updateEntities if @_hasUpdateEntities
      @_updateEntities = {}

      do mainLoop = =>
        cc.requestAnimationFrame mainLoop
        do @physicsClient.signalPaint
        # do @update # done by worker thread
        do @draw

      return

  spawnEntity: (type, x, y, settings) ->
    @_hasUpdateEntities = true
    entity = new (type)(this, x, y, settings)
    entity.id = ++@entityCount
    @entities.push entity
    @entitiesById[entity.id] = @_updateEntities[entity.id] = entity

  # update.. only to be called when running the physics engine in the main
  # javascript process. when a web worker is used the physics data is
  # retrieved via messaging
  update: ->
    # update intercepts
    do entity.update for entity in @entities

    # entities spawned/movements made by entities' update methods
    if @_hasUpdateEntities
      @physicsClient.sendEntities @_updateEntities
      @_hasUpdateEntities = false
      @_updateEntities = {}

    return

  draw: ->
    return unless @tick
    ++@ticks
    do @renderer.clear
    # TODO: draw backgrounds here
    do entity.draw for entity in @entities
    @tick = 0
    return
}
# vim:ts=2 sw=2
