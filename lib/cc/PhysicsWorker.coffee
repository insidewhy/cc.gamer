# object used by physics worker thread to do all processing
cc.module('cc.PhysicsWorker').defines -> @set cc.Class.extend {
  entities: {}

  _log: (stuff...) ->
    self.postMessage log: stuff.join(' ')
    return

  update: ->
    # TODO: send data for positions that have moved
    self.postMessage update: @entities

  startTimer: ->
    # this will not be entirely in sync with the main game
    @_timer = setInterval(
      => do @update
      1000 / 60)
    return

  stopTimer: ->
    clearInterval @_timer
    @_timer = null

  init: ->
    self.onmessage = (event) => @onMessage event.data
    do @startTimer

  onMessage: (data) ->
    if data.entities
      for own id, ent of data.entities
        @entities[id] = ent
    else if data.enabled?
      if data.enabled then do @startTimer else do @stopTimer
    return
}
# vim:ts=2 sw=2
