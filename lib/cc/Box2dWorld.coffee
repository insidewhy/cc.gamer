cc.module('cc.Box2dWorld').defines -> @set cc.Class.extend {
  scale: 30.0 # scale from pixels to physics.. 30 pixels per metre
  entities: []

  init: ->
    # TODO: allow directional gravity
    @b2 = new b2World(new b2Vec2(0 , 0))
    return

  setGravity: (g) ->
    @b2.SetGravity new b2Vec2(g.x, g.y)

  update: (tick) ->
    @b2.Step tick, 4, 8
    @b2.ClearForces()

    data = {}
    for ent in @entities
      data[ent.id] = do ent.compressedPhysics

    data
}
# vim:ts=2 sw=2
