# object used by physics worker thread to do all processing
cc.module('cc.PhysicsWorker').defines -> @set cc.Class.extend {
  entities: {}
  enabled: true
  maxTick: 0.05    # slow time down if tick falls below this
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


    data = {}
    for own id, ent of @entities # TODO: possible to limit only to moved?
      # TODO: don't step.. b2World will move entities
      ent._step @tick # move according to physics
      data[id] = do ent.compressedPhysics

    self.postMessage update: data, tick: @tick
    return

  init: ->
    @world = new cc.Box2dWorld
    @_clockUpdate = new Date().getTime() / 1000
    self.onmessage = (event) => @onMessage event.data
    return

  onMessage: (data) ->
    if data.p
      # client signalled is painting
      do @update
    else if data.n
      for own id, ent of data.n
        @entities[id] = entity = new cc.Box2dEntityPhysics ent, @world
        entity.id = id
    else if data.u
      for own id, uent of data.u
        entity = @entities[id]
        entity.uncompressPhysics uent if entity
    else if data.enabled?
      @enabled = data.enabled
    else if data.config?
      @maxTick = data.config.maxTick if data.config.maxTick
    return
}
# vim:ts=2 sw=2
