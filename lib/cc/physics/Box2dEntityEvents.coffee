cc.module('cc.physics.Box2dEntityEvents').defines -> @set cc.Class.extend {
  v: (entity, args, idx) ->
    s = entity.world.scale
    v = entity._body.GetLinearVelocity()
    m = entity._body.GetMass()
    entity._body.ApplyLinearImpulse new b2Vec2(
        m * (args[idx] / s - v.get_x()),
        m * (args[idx + 1] / s - v.get_y())),
      entity._body.GetWorldCenter()
    3

  p: (entity, args, idx)
    s = entity.world.scale
    entity._body.SetTransform(
      new b2Vec2(args[idx] / s + entity.width / 2,
                 args[idx + 1] / s + entity.height / 2),
      entity._body.GetAngle())
    3

  update: (entity, events) ->
    idx = this[events[0]](entity, events, 1)

    while idx < events.length
      idx = this[events[idx]](entity, args, idx + 1)

    return
}
