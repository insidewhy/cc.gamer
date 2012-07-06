cc.module('cc.Box2dEntityPhysics').defines -> @set cc.Class.extend {
  init: (p, @world) ->
    s = @world.scale
    @width = p[0] / s
    @height = p[1] / s
    @a =
      x: p[6] / s
      y: p[7] / s

    @_fixDef = new b2FixtureDef
    @_fixDef.density = 1.0
    @_fixDef.friction = 0.5
    @_fixDef.restitution = 0.2

    @_bodyDef = new b2BodyDef
    @_bodyDef.type = b2Body.b2_staticBody


    # b2 uses centre position so adjust..
    @_bodyDef.position.Set(p[2] / @world.scale + @width / 2,
                           p[3] / @world.scale - @height / 2)

    @_bodyDef.linearVelocity.Set(p[4] / s, p[5] / s)

    # TODO: support entities without fixed rotation
    @_bodyDef.fixedRotation = true

    @_fixDef.shape = new b2PolygonShape
    @_fixDef.shape.SetAsBox @width / 2, @height / 2

    @world.b2.CreateBody(@_bodyDef).CreateFixture(@_fixDef)

    return

  _step: (tick) ->
    # TODO: leave position handling to box2d
    if @_bodyDef.linearVelocity.x
      @_bodyDef.position.x += @_bodyDef.linearVelocity.x * tick
    if @_bodyDef.linearVelocity.y
      @_bodyDef.position.y += @_bodyDef.linearVelocity.y * tick

    # TODO: but we still need to set acceleration..
    return

  compressedPhysics: ->
    s = @world.scale
    [ (@_bodyDef.position.x - @width / 2) * s,
      (@_bodyDef.position.y + @height / 2) * s,
      @_bodyDef.linearVelocity.x * s,
      @_bodyDef.linearVelocity.y * s,
      @a.x * s, @a.y  * s ]

  uncompressPhysics: (p) ->
    s = @world.scale
    @_bodyDef.position.x = p[0] / s + @width / 2
    @_bodyDef.position.y = p[1] / s - @height / 2
    @_bodyDef.linearVelocity.Set(p[2] / s, p[3] / s)
    @a.x = p[4] / s
    @a.y = p[5] / s
    return
}
# vim:ts=2 sw=2
