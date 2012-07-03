cc.module('cc.PhysicsWorker').defines -> @set cc.Class.extend {
  _log: (stuff...) ->
    self.postMessage log: stuff.join(' ')
    return

  run: ->
    self.onmessage = (event) => @onMessage event.data
    # TODO:
    return

  onMessage: (data) ->
    # TODO:
    return
}
# vim:ts=2 sw=2
