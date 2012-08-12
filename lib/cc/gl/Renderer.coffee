cc.module('cc.gl.Renderer').defines -> @set cc.Class.extend {
  init: (canvas, resources, width, height) ->
    @_getGlContext canvas, width, height

    @_activatedTextureId = -1 # id of current activated texture
    @_shdr = new cc.gl.SpriteShaderProgram
    @_shdr.attachContext @gl
    do @_shdr.link

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

  setTileSize: (width, height) ->
    @_shdr.setTileSize width, height
    return

  setScale: (scale) ->
    @_shdr.perspectiveAndScale 90, scale
    return

  setBackgroundColor: (r, g, b, a) -> @_shdr.clearColor r, g, b, a; this

  selectSprite: (sprite) ->
    newTextureId = sprite.sheet.textureId
    if newTextureId isnt @_activatedTextureId
      @_shdr.activateTexture @texAtlas.textures[newTextureId]
      @_activatedTextureId = newTextureId

    @_shdr.selectTile(
      sprite.sheet.textureTileSize, sprite.tile, sprite.sheet.textureOffset)
    this

  drawSprite: (x, y, z, flipX) ->
    @_shdr.drawAt x, y, z
    @_shdr.flipX flipX
    @gl.drawArrays @gl.TRIANGLE_STRIP, 0, @_shdr.spriteVertices.numItems
    this

  drawingEntities: ->
    @_shdr.modeDynamicEntity()
    return

  drawingSurfaces: ->
    # TODO: better
    @_shdr.modeColor()
    @_shdr.setColor vec4.createFrom(1.0, 0.0, 0.0, 1.0)
    return

  clear: ->
    @gl.clear(@gl.COLOR_BUFFER_BIT | @gl.DEPTH_BUFFER_BIT)
    this
}
# vim:ts=2 sw=2
