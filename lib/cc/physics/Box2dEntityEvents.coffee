cc.module('cc.physics.Box2dEntityEvents').defines -> @set cc.Class.extend {
  # velocity
  v: (entity, args, idx) ->
    s = entity.world.scale
    v = entity._body.GetLinearVelocity()
    m = entity._body.GetMass()
    entity._body.ApplyLinearImpulse new b2Vec2(
        m * (args[idx] / s - v.get_x()),
        m * (args[idx + 1] / s - v.get_y())),
      entity._body.GetWorldCenter()
    3

  # jump.. like velocity but sets friction to 0 also
  # otherwise when jumping and pressing against a wall friction will have
  # a chance to act before the next tick making the jump shallower
  j: (entity, args, idx) ->
    entity._setFriction 0
    @v entity, args, idx

  # position
  p: (entity, args, idx) ->
    s = entity.world.scale
    entity._body.SetTransform(
      new b2Vec2(args[idx] / s + entity.width / 2,
                 args[idx + 1] / s + entity.height / 2),
      entity._body.GetAngle())
    3

  # friction
  f: (entity, args, idx) ->
    entity._setFriction args[idx]
    2

  # request stomp events
  s: (entity) ->
    entity.stompEvents = true
    1

  # request hit events
  h: (entity) ->
    entity.hitEvents = true
    1

  update: (entity, events) ->
    @updateFrom entity, events, this[events[0]](entity, events, 1)

  updateFrom: (entity, events, idx) ->
    while idx < events.length
      idx = idx + this[events[idx]](entity, events, idx + 1)
    return

}
