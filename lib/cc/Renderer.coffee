cc.module('cc.Renderer').defines -> @set cc.Class.extend {
  init: (@gl, scale, resources) ->
    @shdr = new cc.SpriteShaderProgram
    @shdr.attachContext @gl
    do @shdr.link
    @shdr.perspectiveAndScale 90, scale

    # bundles all spritesheets into one huge gl texture
    # TODO: handle need for multiple texture maps
    @texAtlas = new cc.TextureAtlas
    for own path, spriteSheet of resources.spriteSheets
      @texAtlas.addSpriteSheet spriteSheet

    @texAtlas.loadImageToTexture @gl
    @shdr.activateTexture @texAtlas

    return

  setBackgroundColor: (r, g, b, a) -> @shdr.clearColor r, g, b, a; this

  clear: ->
    @gl.clear(@gl.COLOR_BUFFER_BIT | @gl.DEPTH_BUFFER_BIT)
    return
}
# vim:ts=2 sw=2
