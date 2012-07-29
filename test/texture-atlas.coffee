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

showTexture = () ->
  ctxt = cont.getContext('2d')
  ctxt.globalAlpha = 1
  ctxt.fillStyle = 'white'
  ctxt.fillRect(0, 0, 512, 512)

  canvas = atlas._canvases[idx]
  ctxt.drawImage canvas, 0, 0
  count.innerHTML = "Showing #{idx + 1} of #{atlas._canvases.length} textures<br/>"
  count.innerHTML += "Press number keys to switch between textures, c to show texture atlas grid."
  if showTextureGrid
    ctxt.globalAlpha = 0.4
    ctxt.fillStyle = 'green'
    ctxt.strokeStyle = 'black'

    x = y = 0
    for row in canvas.rows
      for colIdx in [0...canvas.colWidth.length]
        colWidth = canvas.colWidth[colIdx]
        ctxt.strokeRect(x, y, colWidth, row.height)
        if row.cells[colIdx]
          ctxt.fillRect(x + 1, y + 1, colWidth - 2, row.height - 2)
        x += colWidth

      x = 0
      y += row.height

window.textureAtlasTest = ->
  window.idx = 0
  window.showTextureGrid = false

  window.onkeypress = (e) ->
    if e.which == 'c'.charCodeAt(0)
      window.showTextureGrid = ! window.showTextureGrid
      showTexture()
    else
      id = e.which - 49
      id = 9 if id is -1
      if 0 <= id < atlas._canvases.length
        window.idx = id
        showTexture()

  window.cont  = document.getElementById 'cont'
  window.count = document.getElementById 'count'
  window.atlas = new cc.TextureAtlas 512, 512
  atlas.addSpriteSheet fakeSpriteSheet(200, 128)
  atlas.addSpriteSheet fakeSpriteSheet(200, 64)
  atlas.addSpriteSheet fakeSpriteSheet(150, 64)
  atlas.addSpriteSheet fakeSpriteSheet(20, 128)
  showTexture()

# vim:ts=2 sw=2
