cc.module('cc.Box2dWorld').defines -> @set cc.Class.extend {
  scale: 30 # scale from pixels to physics.. 30 pixels per metre

  init: ->
    @b2 = do b2World
    return
}
# vim:ts=2 sw=2
