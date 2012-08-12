cc.module('cc.gl.Renderer').defines -> @set cc.Class.extend {
  init: (canvas, resources, width, height) ->
    @_getGlContext canvas, width, height

    @_activatedTextureId = -1 # id of current activated texture
    @shdr = new cc.gl.SpriteShaderProgram
    @shdr.attachContext @gl
    do @shdr.link

    @texAtlas = new cc.gl.TextureAtlas
    for own path, spriteSheet of resources.spriteSheets
      @texAtlas.addSpriteSheet spriteSheet

    @texAtlas.loadToTextures @gl
    return

  _getGlContext: (canvas, width, height) ->
    try
      @gl = canvas.getContext("experimental-webgl")
      @gl.viewportWidth = canvas.width = width
      @gl.viewportHeight = canvas.height = height
    catch e
      alert("could not initialise WebGL")
    return

  setScale: (scale) ->
    @shdr.perspectiveAndScale 90, scale
    return

  setBackgroundColor: (r, g, b, a) -> @shdr.clearColor r, g, b, a; this

  selectSprite: (sprite) ->
    newTextureId = sprite.sheet.textureId
    if newTextureId isnt @_activatedTextureId
      @shdr.activateTexture @texAtlas.textures[newTextureId]
      @_activatedTextureId = newTextureId

    @shdr.selectTile(
      sprite.sheet.textureTileSize, sprite.tile, sprite.sheet.textureOffset)
    this

  drawSprite: (x, y, z, flipX) ->
    @shdr.drawAt x, y, z
    @shdr.flipX flipX
    @gl.drawArrays @gl.TRIANGLE_STRIP, 0, @shdr.spriteVertices.numItems
    this

  clear: ->
    @gl.clear(@gl.COLOR_BUFFER_BIT | @gl.DEPTH_BUFFER_BIT)
    this
}
# vim:ts=2 sw=2
