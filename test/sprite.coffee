logPane = document.getElementsByTagName('body')[0]
log = (arg) ->
  newLine = document.createElement('div')
  newLine.innerHTML = arg
  logPane.appendChild(newLine)

resources = new cc.Resources               # resource loader
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
  vec2.createFrom 6, 5
  vec2.createFrom 7, 5
  vec2.createFrom 8, 5
  vec2.createFrom 7, 5 ]

gl = null

tileSize = vec2.createFrom spriteWidth / spritesheets.width,
                           spriteHeight / spritesheets.height

offsetIdx = 0

squareVertexPositionBuffer = null
squareVertexTextureCoordBuffer = null

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

  squareVertexTextureCoordBuffer = gl.createBuffer()
  gl.bindBuffer gl.ARRAY_BUFFER, squareVertexTextureCoordBuffer
  textureCoords = [
    1.0, 1.0,
    0.0, 1.0,
    1.0, 0.0,
    0.0, 0.0 ]
  gl.bufferData gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW
  squareVertexTextureCoordBuffer.itemSize = 2
  squareVertexTextureCoordBuffer.numItems = 4

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

tick = ->
  cc.requestAnimationFrame tick
  do drawScene
  do animate

window.webGLStart = (width, height) ->
  canvas = document.getElementById "game-canvas"
  resources.image imgPath
  resources.onLoadStatusUpdate (cmplt) ->
    if cmplt >= 1
      gl = cc.initGL canvas, width, height
      shdr.attachContext gl

      do shdr.link
      do initBuffers
      spritesheets.addImage resources.images[imgPath].data
      spritesheets.bindTexture gl
      do shdr.glOptions

      # TODO: hide this stuff
      # a standard square texture
      gl.bindBuffer gl.ARRAY_BUFFER, squareVertexTextureCoordBuffer
      gl.vertexAttribPointer shdr.a.textureCoord, squareVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0
      gl.activeTexture gl.TEXTURE0
      gl.bindTexture gl.TEXTURE_2D, spritesheets.glTexture
      gl.uniform1i shdr.u.sampler, 0

      # setup surface
      gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer
      gl.vertexAttribPointer shdr.a.vertexPosition,
        squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0

      shdr.perspective 90

      do tick

# vim:ts=2 sw=2
