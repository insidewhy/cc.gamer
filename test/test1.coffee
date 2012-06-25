logPane = document.getElementsByTagName('body')[0]
log = (arg) ->
  newLine = document.createElement('div')
  newLine.innerHTML = arg
  logPane.appendChild(newLine)

game = new cc.Game

gl = null
initGL = (canvas, width, height) ->
  try
    gl = canvas.getContext("experimental-webgl")
    gl.viewportWidth = canvas.width = width
    gl.viewportHeight = canvas.height = height
  catch e
    alert("could not initialise WebGL")

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
    return null

  return shader

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

  shdrPrg.pMatrixUniform = gl.getUniformLocation shdrPrg, "uPMatrix"
  shdrPrg.mvMatrixUniform = gl.getUniformLocation shdrPrg, "uMVMatrix"
  return

mvMatrix = mat4.create()
pMatrix = mat4.create()

setMatrixUniforms = () ->
    gl.uniformMatrix4fv shdrPrg.pMatrixUniform, false, pMatrix
    gl.uniformMatrix4fv shdrPrg.mvMatrixUniform, false, mvMatrix

squareVertexPositionBuffer = null

initBuffers = () ->
  squareVertexPositionBuffer = gl.createBuffer()
  gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer
  vertices = [
     1.0,  1.0,  0.0,
    -1.0,  1.0,  0.0,
     1.0, -1.0,  0.0,
    -1.0, -1.0,  0.0 ]
  gl.bufferData gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW
  squareVertexPositionBuffer.itemSize = 3
  squareVertexPositionBuffer.numItems = 4

drawScene = () ->
  gl.viewport 0, 0, gl.viewportWidth, gl.viewportHeight
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  mat4.perspective(90, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix)

  mat4.identity mvMatrix

  mat4.translate mvMatrix, [0.0, 0.0, -2.0]
  gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer
  gl.vertexAttribPointer shdrPrg.vertexPositionAttribute,
    squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0
  setMatrixUniforms()
  gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

window.webGLStart = (width, height) ->
  canvas = document.getElementById "game-canvas"
  initGL canvas, width, height
  initShaders()
  initBuffers()

  gl.clearColor 0.0, 0.0, 0.0, 1.0
  gl.enable gl.DEPTH_TEST

  drawScene()

# vim:ts=2 sw=2
