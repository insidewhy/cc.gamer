# interface to physics worket thread
cc.module('cc.PhysicsClient').defines -> @set cc.Class.extend {

  # pixelScale: how much to scale a pixel down by to get its size in metres
  init: (@pixelScale = 30, @_onUpdate) ->
    cc.onVisibilityChange (state) => @worker.postMessage enabled: not state

  run: ->
    @worker = new Worker('cc/physics.js')
    @worker.onmessage = (event) => @_onMessage event.data
    @worker.onerror = (event) => @_onError event

  # sends new entity data to physics worker thread
  # sets array length to 0
  sendNewEntities: (entities) ->
    # TODO:
    # entities = all entities in current world (e.g. added by boot override)
    #            modified into box2d address space
    data = {}
    for entity in entities
      data[entity.id] = [ entity.width, entity.height,
                          entity.pos.x, entity.pos.y,
                          entity.v.x, entity.v.y,
                          entity.a.x, entity.a.y ]

    @worker.postMessage entities: data

    entities.length = 0

  signalPaint: ->
    @worker.postMessage p: 1

  _onMessage: (msg) ->
    if msg.log and console.log
      console.log "from worker:", msg.log
    else if msg.update
      # TODO: extract data into entity
      do @_onUpdate
    return

  _onError: (event) ->
    # TODO: fall back on in renderer physics for IE9?
    if console.log
      console.log "worker error:", event.message
    return
}
# vim:ts=2 sw=2

