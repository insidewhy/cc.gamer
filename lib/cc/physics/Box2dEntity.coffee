cc.module('cc.physics.Box2dEntity').defines -> @set cc.Class.extend {
  init: (p, @world) ->
    @world.entities.push this

    s = @world.scale
    @width = p[6] / s
    @height = p[7] / s

    @_fixDef = new b2FixtureDef
    filter = new b2Filter
    filter.set_categoryBits p[8]
    filter.set_maskBits p[9]
    @_fixDef.set_filter filter
    @_fixDef.set_restitution p[10]
    @_fixDef.set_friction p[11]
    @_fixDef.set_density p[12]

    @_bodyDef = new b2BodyDef
    # @_bodyDef.set_userData this
    @_bodyDef.set_type Box2D.b2_dynamicBody

    # b2 uses centre position so adjust..
    @_bodyDef.set_position new b2Vec2(p[0] / s + @width / 2, p[1] / s - @height / 2)
    @_bodyDef.set_linearVelocity new b2Vec2(p[2] / s, p[3] / s)

    @a =
      x: p[4] / s
      y: p[5] / s

    # TODO: support entities without fixed rotation
    @_bodyDef.set_fixedRotation true

    shape = new b2PolygonShape
    shape.SetAsBox @width / 2, @height / 2
    @_fixDef.set_shape shape

    @_body = @world.b2.CreateBody @_bodyDef
    @_body.CreateFixture @_fixDef

    return

  _step: (tick) ->
    # TODO: handle acceleration
    return

  compressedPhysics: ->
    s = @world.scale
    v = @_body.GetLinearVelocity()
    p = @_body.GetPosition()
    [ (p.get_x() - @width / 2) * s,
      (p.get_y() + @height / 2) * s,
      v.get_x() * s,
      v.get_y() * s,
      @a.x * s, @a.y  * s ]

  uncompressPhysics: (p) ->
    s = @world.scale
    @_body.SetTransform(
      new b2Vec2(p[0] / s + @width / 2, p[1] / s - @height / 2), @_body.GetAngle())

    # @_body.SetLinearVelocity new b2Vec2(p[2] / s, p[3] / s)
    v = @_body.GetLinearVelocity()
    m = @_body.GetMass()
    @_body.ApplyLinearImpulse new b2Vec2(m * (p[2] / s - v.get_x()),
                                         m * (p[3] / s - v.get_y())), @_body.GetWorldCenter()

    @a.x = p[4] / s
    @a.y = p[5] / s
    return
}
# vim:ts=2 sw=2
