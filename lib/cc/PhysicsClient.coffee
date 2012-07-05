# interface to physics worket thread
cc.module('cc.PhysicsClient').defines -> @set cc.Class.extend {

  # pixelScale: how much to scale a pixel down by to get its size in metres
  init: (@pixelScale = 30, @_onUpdate) ->
    cc.onVisibilityChange (state) => @worker.postMessage enabled: not state
    return

  config: (opts) ->
    @worker.postMessage config: opts
    return

  run: ->
    @worker = new Worker('cc/physics.js')
    @worker.onmessage = (event) => @_onMessage event.data
    @worker.onerror = (event) => @_onError event
    return

  # sends new entity data to physics worker thread
  sendNewEntities: (entities) ->
    # entities = all entities in current world (e.g. added by boot override)
    data = {}
    for own id, entity of entities
      data[id] = do entity.compressedPhysicsForNew

    @worker.postMessage n: data
    return

  sendUpdateEntities: (entities) ->
    data = {}
    for own id, entity of entities
      data[id] = do entity.compressedPhysics

    @worker.postMessage u: data
    return

  signalPaint: ->
    @worker.postMessage p: 1
    return

  _onMessage: (msg) ->
    if msg.log and console.log
      console.log "from worker:", msg.log
    else if msg.update
      @_onUpdate msg.update, msg.tick
    return

  _onError: (event) ->
    # TODO: fall back on in renderer physics for IE9?
    if console.log
      console.log "worker error:", event.message
    return
}
# vim:ts=2 sw=2
