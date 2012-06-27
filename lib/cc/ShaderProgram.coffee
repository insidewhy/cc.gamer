cc.module('cc.ShaderProgram').defines -> @set cc.Class.extend {
  init: (gl) ->
    @gl = gl
    @prgrm = @gl.createProgram()
    @u = {} # uniforms
    @a = {} # attributes

  attachSpriteFragmentShader: ->
    content = """
        precision mediump float;

        varying vec2 vTextureCoord;

        uniform vec2 tileSize;
        uniform vec2 tileOffset;
        uniform vec2 tileCoord;
        uniform sampler2D sampler;

        void main(void) {
          // gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
          gl_FragColor = texture2D(sampler,
              vec2(vTextureCoord.s, vTextureCoord.t) * tileSize +
              (tileSize * tileOffset) + tileCoord);
        }"""
    shader = @gl.createShader @gl.FRAGMENT_SHADER
    @_attachShader shader, content

  attachSpriteVertexShader: ->
    content = """
        attribute vec3 vertexPosition;
        attribute vec2 textureCoord;

        uniform mat4 mvMatrix;
        uniform mat4 pMatrix;

        varying vec2 vTextureCoord;

        void main(void) {
          gl_Position = pMatrix * mvMatrix * vec4(vertexPosition, 1.0);
          vTextureCoord = textureCoord;
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
  requestShaderVariables: ->
    @a.vertexPosition = @gl.getAttribLocation @prgrm, "vertexPosition"
    @gl.enableVertexAttribArray @a.vertexPosition

    @a.textureCoord = @gl.getAttribLocation @prgrm, "textureCoord"
    @gl.enableVertexAttribArray @a.textureCoord

    @u.tileSize = @gl.getUniformLocation @prgrm, "tileSize"
    @u.tileOffset = @gl.getUniformLocation @prgrm, "tileOffset"
    @u.tileCoord = @gl.getUniformLocation @prgrm, "tileCoord"
    @u.sampler = @gl.getUniformLocation @prgrm, "sampler"

    @u.pMatrix = @gl.getUniformLocation @prgrm, "pMatrix"
    @u.mvMatrix = @gl.getUniformLocation @prgrm, "mvMatrix"
}
# vim:ts=2 sw=2
