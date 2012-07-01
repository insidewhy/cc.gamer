logPane = document.getElementsByTagName('body')[0]
log = (arg) ->
  newLine = document.createElement('div')
  newLine.innerHTML = arg
  logPane.appendChild(newLine)

# resource loader
resources = new cc.Resources

# bundles all spritesheets into one huge gl texture
spritesheets = new cc.SpriteSheetTexture

# gl shader program
shdr = new cc.SpriteShaderProgram scale: 2

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

Game = cc.Game.extend {
  # called when game has started
  booted: (_gl) ->
    gl = _gl
    # TODO: move into mainloop
    shdr.attachContext gl

    do initBuffers
    do shdr.link
    spritesheets.addSpriteSheet resources.spriteSheets[imgPath]
    spritesheets.loadImageToTexture gl
    do shdr.glOptions
    shdr.activateTexture spritesheets

    # TODO: move elsewhere
    # surface attribute
    gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer
    gl.vertexAttribPointer shdr.a.vertexPosition,
      squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0

    shdr.perspective 90

  update: ->
    # TODO: move drawScene/animate into framework
    do drawScene
    do animate
    do @parent
}

game = new Game resources

# tile size (as percentage of sheet width)
tileSize = vec2.createFrom spriteWidth / spritesheets.width,
                           spriteHeight / spritesheets.height

offsetIdx = 0

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

  shdr.drawAt 100.0, 0.0
  gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

frameRate = 6 # animation updates per second

timer = do game.timer
animate = ->
  # console.log timer._game.now, timer._expires
  return unless timer.expired()
  timer.expiresIn(1 / frameRate)
  offsetIdx = 0 if ++offsetIdx is tileOffset.length
  return

Entity = cc.Entity.extend {
  # define main sprite, with tile width and height
  spriteSheet: resources.spriteSheet imgPath, 32, 48
}

window.webGLStart = ->
  game.main "#game-canvas", scale: 2

# vim:ts=2 sw=2
