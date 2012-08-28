# Represents physics of an entity.
# Shared by Web Worker and main thread.
# The physics updating part of the code is only used by the main thread in
# case Web Workers aren't available (IE9, some mobile browsers).
cc.module('cc.physics.Entity').defines -> @set cc.Class.extend {
  pos: { x: 0, y: 0, z: 0 } # position
  width:  0
  height: 0
  v:    { x: 0, y: 0 }     # velocity
  maxV: { x: 200, y: 100 } # maximum velocity
  a:    { x: 0, y: 0 }     # acceleration
  bounciness: 0.5          # box2d restitution
  friction:   0.5
  density:    1.0
  # optional - hitbox: { width, height, offset { x, y } }
  _knownByPhysicsServer: false
  _events: [] # physics update events to be sent to physics thread

  _setPos: (x, y) ->
    @pos.x = x
    @pos.y = y
    return

  # compress physics for new entity
  _compressedPhysicsForNew: ->
    x      = @pos.x
    y      = @pos.y
    width  = @width
    height = @height
    if @hitbox
      x     += @hitbox.offset.x
      y     += @hitbox.offset.y
      width  = @hitbox.width
      height = @hitbox.height
    [ x, y, @v.x, @v.y, @a.x, @a.y, width, height, @category, @mask,
      @bounciness, @friction, @density ]

  # compressed physics for update
  # TODO: rotation
  compressedPhysics: ->
    if not @_knownByPhysicsServer
      @_knownByPhysicsServer = true
      return do @_compressedPhysicsForNew
    else
      ev = @_events
      @_events = []
      return ev
    return

  # uncompress physics sent from network, always for update as physics engine
  # can't create new entity
  uncompressPhysics: (p) ->
    [ @pos.x, @pos.y, @v.x, @v.y, @a.x, @a.y ] = p  # :)
    if @hitbox
      @pos.x -= @hitbox.offset.x
      @pos.y -= @hitbox.offset.y
    return
}
# vim:ts=2 sw=2
