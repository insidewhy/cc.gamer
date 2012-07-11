cc.module('cc.Box2dEntityPhysics').defines -> @set cc.Class.extend {
  init: (p, @world) ->
    s = @world.scale
    @width = p[6] / s
    @height = p[7] / s

    @_fixDef = new b2FixtureDef
    @_fixDef.filter.categoryBits = p[8]
    @_fixDef.filter.maskBits = p[9]
    @_fixDef.restitution = p[10]
    @_fixDef.friction = p[11]
    @_fixDef.density = p[12]

    @_bodyDef = new b2BodyDef
    @_bodyDef.userData = this
    @_bodyDef.type = b2Body.b2_dynamicBody

    # b2 uses centre position so adjust..
    @_bodyDef.position.Set(p[0] / s + @width / 2,
                           p[1] / s - @height / 2)

    @_bodyDef.linearVelocity.Set(p[2] / s, p[3] / s)

    @a =
      x: p[4] / s
      y: p[5] / s

    # TODO: support entities without fixed rotation
    @_bodyDef.fixedRotation = true

    @_fixDef.shape = new b2PolygonShape
    @_fixDef.shape.SetAsBox @width / 2, @height / 2

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
    [ (p.x - @width / 2) * s,
      (p.y + @height / 2) * s,
      v.x * s,
      v.y * s,
      @a.x * s, @a.y  * s ]

  uncompressPhysics: (p) ->
    s = @world.scale
    @_body.SetPosition new b2Vec2(p[0] / s + @width / 2, p[1] / s - @height / 2)

    # @_body.SetLinearVelocity new b2Vec2(p[2] / s, p[3] / s)
    v = @_body.GetLinearVelocity()
    m = @_body.GetMass()
    @_body.ApplyImpulse new b2Vec2(m * (p[2] / s - v.x),
                                   m * (p[3] / s - v.y)), @_body.GetWorldCenter()

    @a.x = p[4] / s
    @a.y = p[5] / s
    return
}
# vim:ts=2 sw=2
