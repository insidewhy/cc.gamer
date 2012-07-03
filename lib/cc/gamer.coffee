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

  # TODO: consider splitting out into separate file
  'cc.PhysicsWorker'
).empty()

# vim:ts=2 sw=2
