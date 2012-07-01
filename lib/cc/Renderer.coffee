cc.module('cc.Renderer').defines -> @set cc.Class.extend {
  init: (@gl, scale) ->
    @shdr = new cc.SpriteShaderProgram
    @shdr.attachContext @gl
    do @shdr.link
    @shdr.perspectiveAndScale 90, scale
    return
}
# vim:ts=2 sw=2
