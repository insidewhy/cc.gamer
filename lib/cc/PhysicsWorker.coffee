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

    # TODO: send data for positions that have moved
    self.postMessage update: @entities, tick: @tick
    return

  init: ->
    @_clockUpdate = new Date().getTime() / 1000
    self.onmessage = (event) => @onMessage event.data
    return

  onMessage: (data) ->
    if data.p
      # client signalled is painting
      do @update
    else if data.entities
      for own id, ent of data.entities
        @entities[id] = ent
    else if data.enabled?
      @enabled = data.enabled
    else if data.config?
      @maxTick = data.config.maxTick if data.config.maxTick
    return
}
# vim:ts=2 sw=2
