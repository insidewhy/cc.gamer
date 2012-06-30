logPane = document.getElementsByTagName('body')[0]
log = (arg) ->
  newLine = document.createElement('div')
  newLine.innerHTML = arg
  logPane.appendChild(newLine)

# resource loader
resources = new cc.Resources

# canvas on which to draw all sprite sheets
spriteCanvas = document.createElement 'canvas'

# i think up to 4096 should be okay
spriteCanvas.width = 2048
spriteCanvas.height = 2048

# gl shader program
shdr = null

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

tileSize = vec2.createFrom spriteWidth / spriteCanvas.width,
                           spriteHeight / spriteCanvas.height

offsetIdx = 0

squareVertexPositionBuffer = null
squareVertexTextureCoordBuffer = null

initBuffers = () ->
  squareVertexPositionBuffer = gl.createBuffer()
  gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer

  sY = spriteHeight / 2.0
  sX = spriteWidth / 2.0

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

imgTexture = null
initTexture = () ->
  imgTexture = gl.createTexture()

  # draw sprite sheet at bottom of large spriteCanvas cache
  data = resources.images[imgPath].data
  spriteCanvas.getContext('2d').drawImage(data, 0, spriteCanvas.height - data.height)

  gl.bindTexture gl.TEXTURE_2D, imgTexture
  gl.pixelStorei gl.UNPACK_FLIP_Y_WEBGL, true
  gl.texImage2D gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, spriteCanvas
  gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST
  gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST
  gl.bindTexture gl.TEXTURE_2D, null

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
      shdr = new cc.SpriteShaderProgram gl, scale: 2
      do shdr.link
      initBuffers()
      initTexture()

      gl.clearColor 0.0, 0.0, 0.0, 1.0
      gl.blendFunc gl.SRC_ALPHA, gl.ONE
      gl.enable gl.BLEND
      gl.enable gl.DEPTH_TEST

      # avast
      gl.viewport 0, 0, gl.viewportWidth, gl.viewportHeight

      # a standard square texture
      gl.bindBuffer gl.ARRAY_BUFFER, squareVertexTextureCoordBuffer
      gl.vertexAttribPointer shdr.a.textureCoord, squareVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0
      gl.activeTexture gl.TEXTURE0
      gl.bindTexture gl.TEXTURE_2D, imgTexture
      gl.uniform1i shdr.u.sampler, 0

      # setup surface
      gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer
      gl.vertexAttribPointer shdr.a.vertexPosition,
        squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0

      shdr.perspective 90

      do tick

# vim:ts=2 sw=2
