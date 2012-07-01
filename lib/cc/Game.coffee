cc.module('cc.Game').requires('cc.Timer').defines -> @set cc.Class.extend {
  now: 0        # current game world time
  entities: []  # all alive entities in this game
  maxTick: 0.05 # slow time down if tick falls below this
  scale: 1      # zoom

  # dimensions in pixels, 0 = unset
  width: 0
  height: 0

  # options are optional, @resources is the resource loader
  init: (@resources, options) ->
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

      gl = cc.initGL canvas, @width, @height
      @booted gl if @booted

      # @now = virtual time, now = time
      # virtual time starts at 0
      # it starts off as a constant offset to real time but will lag if
      # any frame is delayed by more than @maxStep
      @now = 0
      now = new Date().getTime() / 1000
      # TODO: more stuff
      do mainLoop = =>
        cc.requestAnimationFrame mainLoop

        newNow = new Date().getTime() / 1000
        @tick = newNow - now
        @tick = @maxStep if @tick > @maxStep # slow down time if necessary
        @now += @tick
        now = newNow
        do @update

      return

  spawnEntity: (type, x, y, settings) -> new (type)(this, x, y, settings)

  update: ->
    # TODO:
}
# vim:ts=2 sw=2
