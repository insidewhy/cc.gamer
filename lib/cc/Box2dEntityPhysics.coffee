cc.module('cc.Box2dEntityPhysics').parent('cc.EntityPhysics').jClass {
  init: (p, @world) ->
    @pos = {}
    s = @world.scale
    @width = p[0] / s
    @height = p[1] / s
    @pos.x = p[2] / s
    @pos.y = p[3] / s
    @v.x = p[4] / s
    @v.y = p[5] / s
    @a.x = p[6] / s
    @a.y = p[7] / s
    return

  compressedPhysics: ->
    s = @world.scale
    [ @pos.x * s, @pos.y * s, @v.x * s, @v.y * s, @a.x * s, @a.y  * s ]

  uncompressPhysics: (p) ->
    s = @world.scale
    @pos.x = p[0] / s
    @pos.y = p[1] / s
    @v.x = p[2] / s
    @v.y = p[3] / s
    @a.x = p[4] / s
    @a.y = p[5] / s
    return
}
# vim:ts=2 sw=2
