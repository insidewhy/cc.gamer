cc.module('cc.Game').requires('cc.Timer').defines -> @set cc.Class.extend {
  now: 0       # current game world time
  entities: [] # all alive entities in this game

  init: (@resources) ->

  # slow time down if tick falls below this
  maxTick: 0.05

  # create a new timer referencing this game's time
  # expiresIn: optional expiry time in seconds
  timer: (expiresIn) ->
    new cc.Timer(this, expiresIn)

  main: (canvas, options) ->
    @maxTick = options.maxTick if options.maxTick
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

        width = options.width or canvas.width
        height = options.height or canvas.height

        gl = cc.initGL canvas, width, height
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

  update: ->
    # TODO:
}
# vim:ts=2 sw=2
