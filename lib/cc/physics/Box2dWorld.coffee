cc.module('cc.physics.Box2dWorld').defines -> @set cc.Class.extend {
  scale: 30.0 # scale from pixels to physics.. 30 pixels per metre
  entities: []

  init: ->
    @b2 = new b2World(new b2Vec2(0 , 0))
    _listener = new b2ContactListener

    self.console = log: (v) -> self.postMessage log: v

    Box2D.customizeVTable(_listener, [{
      original: b2ContactListener.prototype.BeginContact,
      replacement: (ths, contact) =>
        c = Box2D.wrapPointer contact, Box2D.b2Contact
        a = c.GetFixtureA()
        b = c.GetFixtureB()

        if a.foot
          a.entity.groundContact()
        if b.foot
          b.entity.groundContact()
        return
    },
    {
      original: b2ContactListener.prototype.EndContact,
      replacement: (ths, contact) =>
        c = Box2D.wrapPointer contact, Box2D.b2Contact
        a = c.GetFixtureA()
        b = c.GetFixtureB()

        if a.foot
          a.entity.groundLoseContact()
        if b.foot
          b.entity.groundLoseContact()
        return
    }])

    @b2.SetContactListener _listener
    return

  setGravity: (g) ->
    @b2.SetGravity new b2Vec2(g.x, g.y)
    return

  update: (tick) ->
    @b2.Step tick, 4, 8
    @b2.ClearForces()

    data = {}
    for ent in @entities
      data[ent.id] = ent.update()

    data
}
# vim:ts=2 sw=2
