# object used by physics worker thread to do all processing
cc.module('cc.physics.Worker').defines -> @set cc.Class.extend {
  # stuff copied from the Game object of the main process
  entities: {}
  surfaces: {}
  enabled: true
  maxTick: 0.05
  # timing
  now: 0           # current game time
  _clockUpdate: 0  # last time by clock the game updated
  tick: 0          # length between previous update and this one

  _log: (stuff...) ->
    self.postMessage log: stuff.join(' ')
    return

  update: ->
    return unless @enabled

    clock = new Date().getTime() / 1000
    @tick = clock - @_clockUpdate
    @tick = @maxTick if @tick > @maxTick # slow down time if necessary
    @now += @tick
    @_clockUpdate = clock

    data = @world.update @tick
    self.postMessage update: data, tick: @tick
    return

  init: ->
    @world = new cc.physics.Box2dWorld
    @_clockUpdate = new Date().getTime() / 1000
    self.onmessage = (event) => @onMessage event.data
    return

  _isEntity: (data) -> data[0] is 'E'

  onMessage: (data) ->
    if data.p
      # client signalled is painting
      do @update
    else if data.u
      # entities and surfaces
      for own id, updated of data.u
        entity = @entities[id]
        if entity
          entity.uncompressPhysics updated
        else if @_isEntity updated
          @entities[id] = entity = new cc.physics.Box2dEntity updated, @world
          entity.id = id
        else
          @surfaces[id] = surface = new cc.physics.Box2dSurface updated, @world
          surface.id = id
    else if data.enabled?
      @enabled = data.enabled
      do @update if @enabled
    else if data.config?
      @maxTick = data.config.maxTick if data.config.maxTick
      if data.config.gravity
        @world.setGravity data.config.gravity
    return
}
# vim:ts=2 sw=2
