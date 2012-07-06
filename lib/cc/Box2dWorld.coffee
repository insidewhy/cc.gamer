cc.module('cc.Box2dWorld').defines -> @set cc.Class.extend {
  scale: 30 # scale from pixels to physics.. 30 pixels per metre

  init: ->
    # TODO: allow directional gravity
    @b2 = new b2World(new b2Vec2(0 , 0), true)
    return
}
# vim:ts=2 sw=2
