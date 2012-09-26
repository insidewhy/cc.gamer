cc.module('cc.physics.Box2dEntity').requires('cc.physics.Box2dEntityEvents').defines -> @set cc.Class.extend {
  _evHandler: new cc.physics.Box2dEntityEvents
  _events: [] # events to be posted back to game (e.g. stomp/hit)

  isEntity: true

  maxV: { x: 200, y: 100 } # maximum velocity

  groundTouches: 0 # how many elements the foot sensor touches
  standing: false  # is on ground.. when groundTouches == 0

  _onUpdate: null # optional callback to perform on next update

  _setFriction: (val) ->
    @_fix.SetFriction val
    contactEdge =  @_body.GetContactList()
    loop
      break if Box2D.compare(contactEdge, Box2D.NULL)
      contactEdge.get_contact().ResetFriction()
      contactEdge = contactEdge.get_next()
    return

  groundContact: ->
    ++@groundTouches
    if not @standing
      @standing = true
      # groundSensor can fire before actually touching causing the landing
      # force to stop the object sliding on land
      @_onUpdate = ->
        @_setFriction @friction if @standing
    return

  groundLoseContact: ->
    if not --@groundTouches and @standing
      # friction is set to 0 when jumping to avoid sticking to walls
      @standing = false
      @_setFriction 0
    return

  init: (p, @world) ->
    @world.entities.push this

    s = @world.scale
    @width = p[7] / s
    @height = p[8] / s
    @friction = p[12]

    @_fixDef = new b2FixtureDef
    filter = new b2Filter
    filter.set_categoryBits p[9]
    filter.set_maskBits p[10]
    @_fixDef.set_filter filter
    @_fixDef.set_restitution p[11]
    @_fixDef.set_friction @friction
    @_fixDef.set_density p[13]
    @maxV.x = p[14]
    @maxV.y = p[15]

    @_bodyDef = new b2BodyDef
    # @_bodyDef.set_userData this
    @_bodyDef.set_type Box2D.b2_dynamicBody

    width = @width / 2
    height = @height / 2

    # b2 uses centre position so adjust..
    @_bodyDef.set_position new b2Vec2(p[1] / s + width, p[2] / s + height)
    @_bodyDef.set_linearVelocity new b2Vec2(p[3] / s, p[4] / s)

    @a =
      x: p[5] / s
      y: p[6] / s

    # TODO: support entities without fixed rotation
    @_bodyDef.set_fixedRotation true

    shape = new b2PolygonShape
    shape.SetAsBox width, height
    @_fixDef.set_shape shape

    @_body = @world.b2.CreateBody @_bodyDef
    fix = @_body.CreateFixture @_fixDef
    fix.entity = this
    @_fix = fix

    # scale = make foot height of 1/3rd of a pixel
    # too tall and friction can be disabled before it hits the ground
    # making skidding after a jump not happen, too small and bouncing
    # softly against the ground can disable jumping
    ftHeight = 1 / (s * 3 * 2)
    # space around side of foot, to prevent jumping up walls
    ftFree = 1 / (s * 3)
    # add foot sensor
    @_ftSensorDef = new b2FixtureDef
    ftShape = new b2PolygonShape
    ftShape.SetAsBox(width - ftFree,
                     ftHeight,
                     new b2Vec2(0, height + ftHeight),
                     0.0)
    @_ftSensorDef.set_shape ftShape
    @_ftSensorDef.set_isSensor true
    footFixt = @_body.CreateFixture @_ftSensorDef
    footFixt.entity = this
    footFixt.foot = true

    @_evHandler.updateFrom this, p, 16

    return

  _step: (tick) ->
    # TODO: handle acceleration
    return

  update: ->
    if @_onUpdate
      @_onUpdate()
      @_onUpdate = null

    s = @world.scale
    v = @_body.GetLinearVelocity()
    p = @_body.GetPosition()

    ret = [ (p.get_x() - @width / 2) * s,
      (p.get_y() - @height / 2) * s,
      v.get_x() * s, v.get_y() * s,
      @standing ].concat @_events

    @_events.length = 0
    return ret

  uncompressPhysics: (p) ->
    @_evHandler.update this, p
    return
}
# vim:ts=2 sw=2
