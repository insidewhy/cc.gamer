cc.module('cc.ShaderProgram').defines -> @set cc.Class.extend {
  init: (gl) ->
    @gl = gl
    @prgrm = @gl.createProgram()

  attachSpriteFragmentShader: ->
    content = """
        precision mediump float;

        varying vec2 vTextureCoord;

        uniform vec2 vTextureSize;
        uniform vec2 vTextureOffset;
        uniform sampler2D uSampler;

        void main(void) {
          // gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
          gl_FragColor = texture2D(uSampler,
              vec2(vTextureCoord.s, vTextureCoord.t) * vTextureSize +
              (vTextureSize * vTextureOffset));
        }"""
    shader = @gl.createShader @gl.FRAGMENT_SHADER
    @_attachShader shader, content

  attachSpriteVertexShader: ->
    content = """
        attribute vec3 aVertexPosition;
        attribute vec2 aTextureCoord;

        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;

        varying vec2 vTextureCoord;

        void main(void) {
          gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
          vTextureCoord = aTextureCoord;
        }"""
    shader = @gl.createShader @gl.VERTEX_SHADER
    @_attachShader shader, content

  _attachShader: (shader, content) ->
    @gl.shaderSource shader, content
    @gl.compileShader shader

    if not @gl.getShaderParameter shader, @gl.COMPILE_STATUS
      alert @gl.getShaderInfoLog shader
    else
      @gl.attachShader @prgrm, shader
    return

  link: ->
    @gl.linkProgram @prgrm
    if not @gl.getProgramParameter @prgrm, @gl.LINK_STATUS
      alert "Could not initialise shaders"
    @gl.useProgram @prgrm

  # TODO: remove this nonsense
  getSpriteVariables: ->
    @vertexPositionAttribute = @gl.getAttribLocation @prgrm, "aVertexPosition"
    @gl.enableVertexAttribArray @vertexPositionAttribute

    @textureCoordAttribute = @gl.getAttribLocation @prgrm, "aTextureCoord"
    @gl.enableVertexAttribArray @textureCoordAttribute

    @pTextureSzUniform = @gl.getUniformLocation @prgrm, "vTextureSize"
    @pTextureOffsetUniform = @gl.getUniformLocation @prgrm, "vTextureOffset"
    @pMatrixUniform = @gl.getUniformLocation @prgrm, "uPMatrix"
    @mvMatrixUniform = @gl.getUniformLocation @prgrm, "uMVMatrix"
    @samplerUniform = @gl.getUniformLocation @prgrm, "uSampler"
}
# vim:ts=2 sw=2
