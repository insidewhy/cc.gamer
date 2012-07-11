# this module requires all other modules and defines nothing
cc.module('cc.gamer').requires(
  'cc.Core'
  'cc.Image'
  'cc.Entity'
  'cc.Resources'
  'cc.LoadingScreen'
  'cc.SpriteShaderProgram'
  'cc.Sprite'
  'cc.TextureAtlas'
  'cc.SpriteSheet'
  'cc.Game'
  'cc.Renderer'
  'cc.PhysicsClient'
  'cc.Input'

  # TODO: consider splitting out into separate file
  'cc.Box2dEntityPhysics'
  'cc.Box2dWorld'
  'cc.PhysicsWorker'
).empty()

# vim:ts=2 sw=2
