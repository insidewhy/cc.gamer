cc.module('cc.physics.Box2dSurface').defines -> @set cc.Class.extend {
  init: (p, @world) ->
    s = @world.scale
    @width = p[3] / s
    @height = p[4] / s

    @_fixDef = new b2FixtureDef
    filter = new b2Filter
    filter.set_categoryBits 0xffffffff
    filter.set_maskBits 0xffffffff
    @_fixDef.set_filter filter
    @_fixDef.set_friction p[5]
    @_fixDef.set_restitution p[6]

    @_bodyDef = new b2BodyDef
    # @_bodyDef.set_userData this
    @_bodyDef.set_type Box2D.b2_staticBody

    # b2 uses centre position so adjust..
    @_bodyDef.set_position new b2Vec2(p[1] / s + @width / 2, p[2] / s + @height / 2)

    shape = new b2PolygonShape
    shape.SetAsBox @width / 2, @height / 2
    @_fixDef.set_shape shape

    @_body = @world.b2.CreateBody @_bodyDef
    @_body.CreateFixture @_fixDef

    return

  _step: (tick) ->
    # TODO: handle acceleration
    return
}
# vim:ts=2 sw=2
