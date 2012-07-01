# resource loader
resources = new cc.Resources

Game = cc.Game.extend {
  # called when game has started
  booted: ->
    @gl = @renderer.gl
    @hero = @spawnEntity HeroEntity, 0, 0

    do @_initBuffers

    # TODO: move elsewhere
    # surface attribute
    @gl.bindBuffer @gl.ARRAY_BUFFER, @spriteVertices
    @gl.vertexAttribPointer @renderer.shdr.a.vertexPosition,
      @spriteVertices.itemSize, @gl.FLOAT, false, 0, 0

  _initBuffers: ->
    @spriteVertices = @gl.createBuffer()
    @gl.bindBuffer @gl.ARRAY_BUFFER, @spriteVertices

    # bottom left corner of sprite at center of mvMatrix
    vertices = [
      @hero.width, @hero.height, 0.0,
      0.0,         @hero.height, 0.0,
      @hero.width, 0.0,          0.0,
      0.0,         0.0,          0.0 ]
    @gl.bufferData @gl.ARRAY_BUFFER, new Float32Array(vertices), @gl.STATIC_DRAW
    @spriteVertices.itemSize = 3
    @spriteVertices.numItems = 4


  draw: ->
    do @parent

    sprite = @hero.sprite
    @renderer.shdr.selectTile(
      sprite.sheet.textureTileSize, sprite.tile, sprite.sheet.textureOffset)

    # draw
    @renderer.shdr.drawAt 0.0, 0.0
    @gl.drawArrays @gl.TRIANGLE_STRIP, 0, @spriteVertices.numItems

    @renderer.shdr.drawAt 10, 0, -158
    @gl.drawArrays @gl.TRIANGLE_STRIP, 0, @spriteVertices.numItems

    @renderer.shdr.drawAt 10.0, 0, 0
    @gl.drawArrays @gl.TRIANGLE_STRIP, 0, @spriteVertices.numItems

    @renderer.shdr.drawAt 110, 0, 0
    @gl.drawArrays @gl.TRIANGLE_STRIP, 0, @spriteVertices.numItems

    @renderer.shdr.drawAt 100, 0
    @gl.drawArrays @gl.TRIANGLE_STRIP, 0, @spriteVertices.numItems

    # one with a small one on top
    @renderer.shdr.drawAt 140, 0, -128
    @gl.drawArrays @gl.TRIANGLE_STRIP, 0, @spriteVertices.numItems

    @renderer.shdr.drawAt 140, 0
    @gl.drawArrays @gl.TRIANGLE_STRIP, 0, @spriteVertices.numItems

  update: ->
    # TODO: should be done by game loop
    do @hero.update
}

game = new Game resources, scale: 2

HeroEntity = cc.Entity.extend {
  # define main sprite, with tile width and height
  spriteSheet: resources.spriteSheet 'chars.png', 32, 48
  init: (game, x, y, settings) ->
    @parent game, x, y, settings
    @addSprite 'walk', 0.1, [ 30, 31, 32, 31 ]
}

window.webGLStart = ->
  # game.main(document.getElementById "game-canvas")
  game.main "#game-canvas"

# vim:ts=2 sw=2
