# Represents physics of an entity.
# Shared by Web Worker and main thread.
# The physics updating part of the code is only used by the main thread in
# case Web Workers aren't available (IE9, some mobile browsers).
cc.module('cc.EntityPhysics').defines -> @set cc.Class.extend {
  # pos: { x: 0, y: 0, z: 0 } # position
  width:  0
  height: 0
  v:    { x: 0, y: 0 }     # velocity
  maxV: { x: 200, y: 100 } # maximum velocity
  a:    { x: 0, y: 0 }     # acceleration
  # optional - hitbox: { width, height, offset { x, y } }
  _knownByPhysicsServer: false

  _setPos: (x, y) ->
    @pos = x: x, y: y, z: 0
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
    [ x, y, @v.x, @v.y, @a.x, @a.y, width, height, @category, @mask ]

  # compressed physics for update
  # TODO: rotation
  compressedPhysics: ->
    if not @_knownByPhysicsServer
      @_knownByPhysicsServer = true
      return do @_compressedPhysicsForNew

    x = @pos.x
    y = @pos.y
    if @hitbox
      x += @hitbox.offset.x
      y += @hitbox.offset.y
    [ x, y, @v.x, @v.y, @a.x, @a.y ]

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
