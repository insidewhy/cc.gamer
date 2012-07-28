fakeSpriteSheet = (width, height) ->
  canvas = document.createElement 'canvas'
  canvas.height = height
  canvas.width = width
  ctxt = canvas.getContext('2d')
  ctxt.strokeStyle = 'red'
  ctxt.fillStyle = 'yellow'
  ctxt.strokeRect(0, 0, width, height)
  ctxt.fillRect(1, 1, width - 2, height - 2)
  image: { data: canvas }

window.textureAtlasTest = ->
  cont  = document.getElementById 'cont'
  atlas = new cc.TextureAtlas 512, 512
  cont.appendChild atlas._canvas
  atlas.addSpriteSheet fakeSpriteSheet(200, 128)
  atlas.addSpriteSheet fakeSpriteSheet(200, 64)
  atlas.addSpriteSheet fakeSpriteSheet(200, 64)

# vim:ts=2 sw=2
