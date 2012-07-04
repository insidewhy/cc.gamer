# object used by physics worker thread to do all processing
cc.module('cc.PhysicsWorker').defines -> @set cc.Class.extend {
  entities: {}
  enabled: true

  _log: (stuff...) ->
    self.postMessage log: stuff.join(' ')
    return

  update: ->
    return unless @enabled
    # TODO: send data for positions that have moved
    self.postMessage update: @entities

  init: ->
    self.onmessage = (event) => @onMessage event.data

  onMessage: (data) ->
    if data.p
      # client signalled is painting
      do @update
    else if data.entities
      for own id, ent of data.entities
        @entities[id] = ent
    else if data.enabled?
      @enabled = data.enabled
    return
}
# vim:ts=2 sw=2
