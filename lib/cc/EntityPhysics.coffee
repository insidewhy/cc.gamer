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

  _setPos: (x, y) ->
    @pos = x: x, y: y, z: 0

  init: (@width, @height, px, py, vx, vy, ax, ay) ->
    @pos.x = px ; @pos.y = py
    @v.x   = vx ; @v.y   = vy
    @a.x   = ax ; @a.y   = ay

  _step: (tick) ->
    # TODO: increase v by acceleration up to maxV
    @pos.x += @v.x * @game.tick if @v.x
    @pos.y += @v.y * @game.tick if @v.y

  # compress physics for new entity
  compressedPhysicsForNew: ->
    [ @width, @height, @pos.x, @pos.y, @v.x, @v.y, @a.x, @a.y ]

  # compressed physics for update
  # TODO: rotation
  compressedPhysics: ->
    [ @pos.x, @pos.y, @v.x, @v.y, @a.x, @a.y ]

  # uncompress physics sent from network, always for update as physics engine
  # can't create new entity
  uncompressPhysics: (p) ->
    [ @pos.x, @pos.y, @v.x, @v.y, @a.x, @a.y ] = p  # :)
    return
}
# vim:ts=2 sw=2
