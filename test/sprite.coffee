logPane = document.getElementsByTagName('body')[0]
log = (arg) ->
  newLine = document.createElement('div')
  newLine.innerHTML = arg
  logPane.appendChild(newLine)

# resource loader
resources = new cc.Resources

gl = null
initGL = (canvas, width, height) ->
  try
    gl = canvas.getContext("experimental-webgl")
    gl.viewportWidth = canvas.width = width
    gl.viewportHeight = canvas.height = height
  catch e
    alert("could not initialise WebGL")
  return

getShader = (gl, id) ->
  shaderScript = document.getElementById(id)
  return null unless shaderScript

  str = ""
  k = shaderScript.firstChild
  while k
    str += k.textContent if k.nodeType is 3
    k = k.nextSibling

  shader
  if shaderScript.type is "x-shader/x-fragment"
    shader = gl.createShader gl.FRAGMENT_SHADER
  else if shaderScript.type is "x-shader/x-vertex"
    shader = gl.createShader gl.VERTEX_SHADER
  else
    return null

  gl.shaderSource shader, str
  gl.compileShader shader

  if not gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    alert gl.getShaderInfoLog(shader)
    null
  else
    shader

shdrPrg = null

initShaders = () ->
  fragmentShader = getShader(gl, "shader-fs")
  vertexShader = getShader(gl, "shader-vs")

  shdrPrg = gl.createProgram()
  gl.attachShader shdrPrg, vertexShader
  gl.attachShader shdrPrg, fragmentShader
  gl.linkProgram shdrPrg

  if not gl.getProgramParameter shdrPrg, gl.LINK_STATUS
    alert "Could not initialise shaders"

  gl.useProgram shdrPrg

  shdrPrg.vertexPositionAttribute = gl.getAttribLocation shdrPrg, "aVertexPosition"
  gl.enableVertexAttribArray shdrPrg.vertexPositionAttribute

  shdrPrg.textureCoordAttribute = gl.getAttribLocation shdrPrg, "aTextureCoord"
  gl.enableVertexAttribArray shdrPrg.textureCoordAttribute

  shdrPrg.pTextureSzUniform = gl.getUniformLocation shdrPrg, "vTextureSize"
  shdrPrg.pTextureOffsetUniform = gl.getUniformLocation shdrPrg, "vTextureOffset"
  shdrPrg.pMatrixUniform = gl.getUniformLocation shdrPrg, "uPMatrix"
  shdrPrg.mvMatrixUniform = gl.getUniformLocation shdrPrg, "uMVMatrix"
  shdrPrg.samplerUniform = gl.getUniformLocation shdrPrg, "uSampler"
  return

mvMatrix = mat4.create()
pMatrix = mat4.create()
szVector = vec2.createFrom 0.5, 0.5
# szVector = vec2.createFrom 1.0, 1.0
offsets = [
  vec2.createFrom 0, 0
  vec2.createFrom 0, 1
  vec2.createFrom 1, 1
  vec2.createFrom 0, 1
]

offsetVector = offsets[0]
offsetIdx = 0

setMatrixUniforms = () ->
  gl.uniformMatrix4fv shdrPrg.pMatrixUniform, false, pMatrix
  gl.uniformMatrix4fv shdrPrg.mvMatrixUniform, false, mvMatrix
  gl.uniform2fv shdrPrg.pTextureSzUniform, szVector
  gl.uniform2fv shdrPrg.pTextureOffsetUniform, offsetVector

squareVertexPositionBuffer = null
squareVertexTextureCoordBuffer = null

initBuffers = () ->
  squareVertexPositionBuffer = gl.createBuffer()
  gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer
  scale = 256.0
  vertices = [
     scale,  scale,  0.0,
    -scale,  scale,  0.0,
     scale, -scale,  0.0,
    -scale, -scale,  0.0 ]
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
  imgTexture.img = resources.images['mario.gif']
  gl.bindTexture gl.TEXTURE_2D, imgTexture
  gl.pixelStorei gl.UNPACK_FLIP_Y_WEBGL, true
  gl.texImage2D gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgTexture.img.data
  gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST
  gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST
  gl.bindTexture gl.TEXTURE_2D, null

drawScene = () ->
  gl.viewport 0, 0, gl.viewportWidth, gl.viewportHeight
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  mat4.perspective(90, gl.viewportWidth / gl.viewportHeight, 300.0, 600.0, pMatrix)

  # move to position to place square
  mat4.identity mvMatrix
  mat4.translate mvMatrix, [0.0, 0.0, -gl.viewportWidth]

  # setup vertices
  gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer
  gl.vertexAttribPointer shdrPrg.vertexPositionAttribute,
    squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0
  setMatrixUniforms()

  # setup texture
  gl.bindBuffer gl.ARRAY_BUFFER, squareVertexTextureCoordBuffer
  gl.vertexAttribPointer shdrPrg.textureCoordAttribute, squareVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0

  gl.activeTexture gl.TEXTURE0
  gl.bindTexture gl.TEXTURE_2D, imgTexture
  gl.uniform1i shdrPrg.samplerUniform, 0

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

frameRate = 0.5
nextFrame = (new Date().getTime() / 1000) + frameRate

animate = ->
  now = new Date().getTime() / 1000
  return if now < nextFrame

  if ++offsetIdx is offsets.length
    offsetIdx = 0

  offsetVector = offsets[offsetIdx]

  vec2.createFrom 0, 0

  nextFrame = now + frameRate

tick = ->
  requestAnimFrame tick
  do drawScene
  do animate

window.webGLStart = (width, height) ->
  canvas = document.getElementById "game-canvas"
  resources.image 'mario.gif'
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

      do tick
      # do drawScene

# vim:ts=2 sw=2
