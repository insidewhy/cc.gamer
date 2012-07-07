cc.module('cc.Box2dWorld').defines -> @set cc.Class.extend {
  scale: 30.0 # scale from pixels to physics.. 30 pixels per metre

  init: ->
    # TODO: allow directional gravity
    @b2 = new b2World(new b2Vec2(0 , 0), true)
    return

  setGravity: (g) ->
    @b2.SetGravity new b2Vec2(g.x, g.y)

  update: (tick) ->
    @b2.Step tick, 10, 10
    @b2.ClearForces()

    data = {}
    b = @b2.GetBodyList()
    loop
      break unless b
      ent = do b.GetUserData
      if ent
        data[ent.id] = do ent.compressedPhysics

      b = b.m_next

    data
}
# vim:ts=2 sw=2
