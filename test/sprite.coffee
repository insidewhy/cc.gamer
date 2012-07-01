logPane = document.getElementsByTagName('body')[0]
log = (arg) ->
  newLine = document.createElement('div')
  newLine.innerHTML = arg
  logPane.appendChild(newLine)

# resource loader
resources = new cc.Resources

# bundles all spritesheets into one huge gl texture
texAtlas = new cc.TextureAtlas

# gl shader program
shdr = new cc.SpriteShaderProgram

# offset into canvas texture cache of current tilesheet
tileCoord = vec2.createFrom 0, 0

imgPath = 'chars.png'
spriteHeight = 48.0
spriteWidth = 32.0
tileOffset = [
  vec2.createFrom 6, 2
  vec2.createFrom 7, 2
  vec2.createFrom 8, 2
  vec2.createFrom 7, 2 ]

gl = null
offsetIdx = 0

Game = cc.Game.extend {
  # called when game has started
  booted: (_gl) ->
    gl = _gl
    # TODO: move into mainloop
    shdr.attachContext gl
    do shdr.link

    do initBuffers
    texAtlas.addSpriteSheet resources.spriteSheets[imgPath]
    texAtlas.loadImageToTexture gl
    shdr.activateTexture texAtlas

    # TODO: move elsewhere
    # surface attribute
    gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer
    gl.vertexAttribPointer shdr.a.vertexPosition,
      squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0

    shdr.perspectiveAndScale 90, game.scale

  update: ->
    # TODO: move drawScene/animate into framework
    do drawScene
    if timer.expired()
      do timer.reset
      offsetIdx = 0 if ++offsetIdx is tileOffset.length
    do @parent
}

game = new Game resources, scale: 2

# tile size (as percentage of sheet width)
tileSize = vec2.createFrom spriteWidth / texAtlas.width,
                           spriteHeight / texAtlas.height

squareVertexPositionBuffer = null

initBuffers = () ->
  squareVertexPositionBuffer = gl.createBuffer()
  gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer

  # bottom left corner of sprite at center of mvMatrix
  vertices = [
    spriteWidth, spriteHeight, 0.0,
    0.0,         spriteHeight, 0.0,
    spriteWidth, 0.0,          0.0,
    0.0,         0.0,          0.0 ]
  gl.bufferData gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW
  squareVertexPositionBuffer.itemSize = 3
  squareVertexPositionBuffer.numItems = 4

drawScene = () ->
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  # change tilesheet offset
  shdr.selectTile tileSize, tileOffset[offsetIdx], tileCoord

  # draw
  shdr.drawAt 0.0, 0.0
  gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

  shdr.drawAt 10, 0, -158
  gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

  shdr.drawAt 10.0, 0, 0
  gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

  shdr.drawAt 110, 0, 0
  gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

  shdr.drawAt 100, 0
  gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

  # one with a small one on top
  shdr.drawAt 140, 0, -128
  gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

  shdr.drawAt 140, 0
  gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems


frameRate = 6 # animation updates per second

timer = game.timer(1 / frameRate)

Entity = cc.Entity.extend {
  # define main sprite, with tile width and height
  spriteSheet: resources.spriteSheet imgPath, 32, 48
}

window.webGLStart = ->
  # game.main(document.getElementById "game-canvas")
  game.main "#game-canvas"

# vim:ts=2 sw=2
