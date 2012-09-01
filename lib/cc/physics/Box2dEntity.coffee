cc.module('cc.physics.Box2dEntity').requires('cc.physics.Box2dEntityEvents').defines -> @set cc.Class.extend {
  _evHandler: new cc.physics.Box2dEntityEvents

  maxV: { x: 200, y: 100 } # maximum velocity

  groundTouches: 0 # how many elements the foot sensor touches
  standing: false  # is on ground.. when groundTouches == 0

  groundContact: ->
    if ++@groundTouches is 1
      @standing = true
    return

  groundLoseContact: ->
    if not --@groundTouches
      @standing = false
    return

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
    @maxV.x = p[13]
    @maxV.y = p[14]

    @_bodyDef = new b2BodyDef
    # @_bodyDef.set_userData this
    @_bodyDef.set_type Box2D.b2_dynamicBody

    width = @width / 2
    height = @height / 2

    # b2 uses centre position so adjust..
    @_bodyDef.set_position new b2Vec2(p[0] / s + width, p[1] / s + height)
    @_bodyDef.set_linearVelocity new b2Vec2(p[2] / s, p[3] / s)

    @a =
      x: p[4] / s
      y: p[5] / s

    # TODO: support entities without fixed rotation
    @_bodyDef.set_fixedRotation true

    shape = new b2PolygonShape
    shape.SetAsBox width, height
    @_fixDef.set_shape shape

    @_body = @world.b2.CreateBody @_bodyDef
    fix = @_body.CreateFixture @_fixDef
    fix.entity = this
    @_fix = fix

    # add foot sensor
    @_ftSensorDef = new b2FixtureDef
    ftShape = new b2PolygonShape
    # scale = units to 1 pixel, make the foot a height of 1/3 pixel
    ftShape.SetAsBox(width, s / (3 * 2), new b2Vec2(0, -height), 0.0)
    @_ftSensorDef.set_shape ftShape
    @_ftSensorDef.set_isSensor true
    footFixt = @_body.CreateFixture @_fixDef
    footFixt.entity = this
    footFixt.foot = true

    return

  _step: (tick) ->
    # TODO: handle acceleration
    return

  compressedPhysics: ->
    s = @world.scale
    v = @_body.GetLinearVelocity()
    p = @_body.GetPosition()
    [ (p.get_x() - @width / 2) * s,
      (p.get_y() - @height / 2) * s,
      v.get_x() * s, v.get_y() * s,
      @standing ]

  uncompressPhysics: (p) ->
    @_evHandler.update this, p
    return
}
# vim:ts=2 sw=2
