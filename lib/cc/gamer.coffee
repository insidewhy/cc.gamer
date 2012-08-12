# this module requires all other modules and defines nothing
cc.module('cc.gamer').requires(
  'cc.Core'
  'cc.Image'
  'cc.Entity'
  'cc.Surface'
  'cc.Resources'
  'cc.LoadingScreen'
  'cc.Sprite'
  'cc.SpriteSheet'
  'cc.Game'
  'cc.Input'

  # cc.gamer's internal gl only backend
  'cc.gl.Renderer'
  'cc.gl.TextureAtlas'
  'cc.gl.SpriteShaderProgram'

  # twod backend
  # ... TODO ...

  'cc.physics.Box2dEntity'
  'cc.physics.Box2dSurface'
  'cc.physics.Box2dWorld'
  'cc.physics.Worker'
  'cc.physics.Client'
).empty()

# vim:ts=2 sw=2
