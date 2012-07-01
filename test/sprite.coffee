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

# tile size as percentage of sheet width
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
  gl.uniform2fv shdr.u.tileSize, tileSize
  gl.uniform2fv shdr.u.tileOffset, tileOffset[offsetIdx]
  gl.uniform2fv shdr.u.tileCoord, tileCoord

  # draw
  shdr.drawAt 0.0, 0.0
  gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

  shdr.drawAt 100.0, 0.0
  gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

frameRate = 4 # animation updates per second
nextFrame = (new Date().getTime() / 1000) + 1/frameRate

animate = ->
  now = new Date().getTime() / 1000
  return if now < nextFrame

  if ++offsetIdx is tileOffset.length
    offsetIdx = 0

  vec2.createFrom 0, 0

  nextFrame = now + 1/frameRate
  return

Entity = cc.Entity.extend {
  # define main sprite, with tile width and height
  spriteSheet: resources.spriteSheet imgPath, 32, 48
}

Game = cc.Game.extend {
  init: (_gl) ->
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

window.webGLStart = ->
  cc.main "#game-canvas", Game, resources, scale: 2

# vim:ts=2 sw=2
