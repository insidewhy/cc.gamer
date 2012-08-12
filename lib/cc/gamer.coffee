# this module requires all other modules and defines nothing
cc.module('cc.gamer').requires(
  'cc.Core'
  'cc.Image'
  'cc.Entity'
  'cc.Resources'
  'cc.LoadingScreen'
  'cc.Sprite'
  'cc.SpriteSheet'
  'cc.Game'
  'cc.physics.Client'
  'cc.Input'

  # cc.gamer's gl only backend
  'cc.gl.Renderer'
  'cc.gl.TextureAtlas'
  'cc.gl.SpriteShaderProgram'

  # twod backend
  # ... TODO ...

  # TODO: consider splitting out into separate file
  'cc.physics.Box2dEntity'
  'cc.physics.Box2dWorld'
  'cc.physics.Worker'
).empty()

# vim:ts=2 sw=2
