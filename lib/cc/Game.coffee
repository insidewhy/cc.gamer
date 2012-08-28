cc.module('cc.Game').requires('cc.Timer').defines -> @set cc.Class.extend {
  now: 0        # current game world time
  tick: 1       # length of previous frame
  # tick is set to 0 after each draw to avoid two draws with no output, so
  # it starts at 1 so the first draw can run
  entities: []      # all alive entities in this game
  entitiesById: {}  # same as above but hashed by id
  surfaces: []
  surfacesById: {}
  _updates: {}  # entities that have been updated
  _hasUpdates: false # if _updates has a single entry
  maxTick: 0.05 # slow time down if tick falls below this
  gravity: { x: 0, y: 0 }  # world gravity
  # maxTick must be set before main is called for the physic client to get it
  scale: 1      # zoom
  box2dScale: 30 # how much to scale pixels down by for box2d
  _thingCount: 0  # counter used to generate id for entities/surfaces
  renderer: null
  input:    null
  viewport: null
  useWebWorker: true  # whether to use web worker thread.
  # will be set to false by main if it determines workers are not available
  backgroundColor: [0.0, 0.0, 0.0, 1.0] # default background colour

  # time logging
  ticks: 0      # the number of ticks that have been rendered
  skips: 0      # the number of ticks that were skipped due to lagging physics
  updates: 0    # number of updates from physics client

  # dimensions in pixels, 0 = unset
  width: 0
  height: 0

  # options are optional, @resources is the resource loader
  init: (@resources, options) ->
    @physicsClient = new cc.physics.Client @box2dScale, (data, tick) =>
      for own id, uent of data
        entity = @entitiesById[id]
        entity.uncompressPhysics uent if entity

      @tick = tick
      @now += tick
      do @update
    @setOptions options
    @input = new cc.Input

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

  # change scale of game.
  # can do this while the game is running.
  setScale: (@scale) ->
    @viewport.setScreenDimensions @width / @scale, @height / @scale
    @renderer.setScale @scale
    return

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
      @viewport = new cc.Viewport @width, @height, @width, @height

      try
        # TODO: support more renderers
        @renderer = new cc.gl.Renderer canvas, @resources, @width, @height, @viewport
      catch e
        # TODO: fall back on canvas if there is no open GL
        alert "sorry WebGL is not enabled/supported in your browser, please try Firefox or Chrome #{e.stack}"
        return

      @setScale @scale

      c = @backgroundColor
      @renderer.setBackgroundColor c[0], c[1], c[2], c[3]
      do @input.enable
      do @booted if @booted

      do @physicsClient.run
      @physicsClient.sendConfig maxTick: @maxTick, gravity: @gravity
      @physicsClient.sendUpdates @_updates
      @_updates = {}

      do mainLoop = =>
        cc.requestAnimationFrame mainLoop
        # do @update # done by worker thread
        do @draw

      return

  spawnEntity: (type, x, y, settings) ->
    @_hasUpdates = true
    entity = new (type)(this, x, y, settings)
    entity.id = ++@_thingCount
    @entities.push entity
    @entitiesById[entity.id] = @_updates[entity.id] = entity

  addSurface: (sheet, tileIdx, x, y, width, height, bounciness) ->
    @_hasUpdates = true
    surface = new cc.Surface this, sheet, tileIdx, x, y, width, height, bounciness

    surface.id = ++@_thingCount
    @surfaces.push surface
    @surfacesById[surface.id] = @_updates[surface.id] = surface

  # update.. only to be called when running the physics engine in the main
  # javascript process. when a web worker is used the physics data is
  # retrieved via messaging
  update: ->
    # update intercepts
    ++@updates
    do entity.update for entity in @entities

    # entities spawned/movements made by entities' update methods
    if @_hasUpdates
      @physicsClient.sendUpdates @_updates
      @_hasUpdates = false
      @_updates = {}

    do @input.update
    return

  draw: ->
    if not @tick
      # TODO: interpolate points based on existing velocities
      ++@skips
    else
      do @physicsClient.signalPaint
      ++@ticks
      do @renderer.clear

      # TODO: layers etc.
      do @renderer.drawingEntities
      do entity.draw for entity in @entities
      do @renderer.drawingSurfaces
      do surface.draw for surface in @surfaces
      @tick = 0
    return
}
# vim:ts=2 sw=2
