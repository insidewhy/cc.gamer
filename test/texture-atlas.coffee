fakeSpriteSheet = (width, height, color) ->
  canvas = document.createElement 'canvas'
  canvas.height = height
  canvas.width = width
  ctxt = canvas.getContext('2d')
  ctxt.fillStyle = color
  ctxt.fillRect(0, 0, width, height)
  image: { data: canvas }

window.textureAtlasTest = ->
  cont  = document.getElementById 'cont'
  atlas = new cc.TextureAtlas 512, 512
  cont.appendChild atlas._canvas
  atlas.addSpriteSheet fakeSpriteSheet(200, 128, 'purple')
  atlas.addSpriteSheet fakeSpriteSheet(200, 64, 'red')
  atlas.addSpriteSheet fakeSpriteSheet(200, 64, 'blue')

# vim:ts=2 sw=2
