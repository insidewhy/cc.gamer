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
initGL = (canvas, width, height) ->
  try
    gl = canvas.getContext("experimental-webgl")
    gl.viewportWidth = canvas.width = width
    gl.viewportHeight = canvas.height = height
  catch e
    alert("could not initialise WebGL")
  return

shdrPrg = null

initShaders = () ->
  shdrPrg = new cc.ShaderProgram gl
  do shdrPrg.attachSpriteFragmentShader
  do shdrPrg.attachSpriteVertexShader
  do shdrPrg.link
  do shdrPrg.requestShaderVariables
  return

tileSize = vec2.createFrom spriteWidth / spriteCanvas.width,
                           spriteHeight / spriteCanvas.height

mvMatrix = mat4.create()
pMatrix = mat4.create()

offsetIdx = 0

squareVertexPositionBuffer = null
squareVertexTextureCoordBuffer = null

initBuffers = () ->
  squareVertexPositionBuffer = gl.createBuffer()
  gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer

  sY = spriteHeight / 2.0
  sX = spriteWidth / 2.0
  vertices = [
     sX,  sY,  0.0,
    -sX,  sY,  0.0,
     sX, -sY,  0.0,
    -sX, -sY,  0.0 ]
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

  # move to position to place square
  mat4.identity mvMatrix
  # mat4.translate mvMatrix, [0.0, 0.0, (-gl.viewportHeight / 2)]
  # zoom 2
  mat4.translate mvMatrix, [0.0, 0.0, -gl.viewportHeight / 4]

  # change tilesheet offset
  gl.uniformMatrix4fv shdrPrg.u.mvMatrix, false, mvMatrix
  gl.uniform2fv shdrPrg.u.tileSize, tileSize
  gl.uniform2fv shdrPrg.u.tileOffset, tileOffset[offsetIdx]
  gl.uniform2fv shdrPrg.u.tileCoord, tileCoord

  # draw
  gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

window.requestAnimFrame = do ->
  window.requestAnimationFrame or
         window.webkitRequestAnimationFrame or
         window.mozRequestAnimationFrame or
         window.oRequestAnimationFrame or
         window.msRequestAnimationFrame or
         (callback, element) ->
           window.setTimeout callback, 1000/60

frameRate = 0.3
nextFrame = (new Date().getTime() / 1000) + frameRate

animate = ->
  now = new Date().getTime() / 1000
  return if now < nextFrame

  if ++offsetIdx is tileOffset.length
    offsetIdx = 0

  vec2.createFrom 0, 0

  nextFrame = now + frameRate

tick = ->
  requestAnimFrame tick
  do drawScene
  do animate

window.webGLStart = (width, height) ->
  canvas = document.getElementById "game-canvas"
  resources.image imgPath
  resources.onLoadStatusUpdate (cmplt) ->
    if cmplt >= 1
      initGL canvas, width, height
      initShaders()
      initBuffers()
      initTexture()

      gl.clearColor 0.0, 0.0, 0.0, 1.0
      gl.blendFunc gl.SRC_ALPHA, gl.ONE
      gl.enable gl.BLEND
      gl.enable gl.DEPTH_TEST

      # setup texture
      # TODO: this should change for different surfaces
      gl.bindBuffer gl.ARRAY_BUFFER, squareVertexTextureCoordBuffer
      gl.vertexAttribPointer shdrPrg.a.textureCoord, squareVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0
      gl.activeTexture gl.TEXTURE0
      gl.bindTexture gl.TEXTURE_2D, imgTexture
      gl.uniform1i shdrPrg.u.sampler, 0

      # setup surface
      gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer
      gl.vertexAttribPointer shdrPrg.a.vertexPosition,
        squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0

      # and perspesctive
      # TODO: reduce interval between min/max
      mat4.perspective(90, gl.viewportWidth / gl.viewportHeight, 1.0, 300.0, pMatrix)
      gl.uniformMatrix4fv shdrPrg.u.pMatrix, false, pMatrix

      # avast
      gl.viewport 0, 0, gl.viewportWidth, gl.viewportHeight

      do tick

# vim:ts=2 sw=2
