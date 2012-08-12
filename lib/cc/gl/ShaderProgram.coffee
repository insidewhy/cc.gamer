cc.module('cc.gl.ShaderProgram').defines -> @set cc.Class.extend {
  init: ->
    @u = {} # uniforms
    @a = {} # attributes
    return

  # attach this shader to a gl program
  attachContext: (@gl) ->
    @prgrm = @gl.createProgram()
    return

  _attachShader: (shader, content) ->
    @gl.shaderSource shader, content
    @gl.compileShader shader

    if not @gl.getShaderParameter shader, @gl.COMPILE_STATUS
      alert @gl.getShaderInfoLog shader
    else
      @gl.attachShader @prgrm, shader
    return

  _attribVertices: (names...) ->
    for name in names
      @gl.enableVertexAttribArray(@a[name] = @gl.getAttribLocation @prgrm, name)
    return

  _uniforms: (names...) ->
    for name in names
      @u[name] = @gl.getUniformLocation @prgrm, name
    return

  # override this to attach fragment shaders first
  link: ->
    @gl.linkProgram @prgrm
    if not @gl.getProgramParameter @prgrm, @gl.LINK_STATUS
      alert "Could not initialise shaders"
    @gl.useProgram @prgrm
}

# vim:ts=2 sw=2
