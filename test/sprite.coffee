# resource loader
resources = new cc.Resources

# bundles all spritesheets into one huge gl texture
texAtlas = new cc.TextureAtlas

# offset into canvas texture cache of current tilesheet
tileCoord = vec2.createFrom 0, 0

imgPath = 'chars.png'
spriteHeight = 48.0
spriteWidth = 32.0

gl = null

Game = cc.Game.extend {
  # called when game has started
  booted: ->
    gl = @renderer.gl

    @hero = @spawnEntity HeroEntity, 0, 0

    # TODO: load spritesheets into atlas in renderer
    texAtlas.addSpriteSheet resources.spriteSheets[imgPath]
    texAtlas.loadImageToTexture gl
    @renderer.shdr.activateTexture texAtlas

    do initBuffers
    # TODO: move elsewhere
    # surface attribute
    gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer
    gl.vertexAttribPointer @renderer.shdr.a.vertexPosition,
      squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0

    # tile size (as percentage of sheet width)
    @tileSize = vec2.createFrom @hero.width  / texAtlas.width,
                                @hero.height / texAtlas.height

  update: ->
    # TODO: move drawScene/animate into framework
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    # change tilesheet offset
    do @hero.update

    @renderer.shdr.selectTile @tileSize, @hero.activeSprite.tile, tileCoord

    # draw
    @renderer.shdr.drawAt 0.0, 0.0
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    @renderer.shdr.drawAt 10, 0, -158
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    @renderer.shdr.drawAt 10.0, 0, 0
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    @renderer.shdr.drawAt 110, 0, 0
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    @renderer.shdr.drawAt 100, 0
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    # one with a small one on top
    @renderer.shdr.drawAt 140, 0, -128
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    @renderer.shdr.drawAt 140, 0
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    do @parent
}

game = new Game resources, scale: 2

squareVertexPositionBuffer = null

initBuffers = () ->
  squareVertexPositionBuffer = gl.createBuffer()
  gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer

  # bottom left corner of sprite at center of mvMatrix
  vertices = [
    spriteWidth, spriteHeight, 0.0,
    0.0,         spriteHeight, 0.0,
    spriteWidth, 0.0,          0.0,
    0.0,         0.0,          0.0 ]
  gl.bufferData gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW
  squareVertexPositionBuffer.itemSize = 3
  squareVertexPositionBuffer.numItems = 4

HeroEntity = cc.Entity.extend {
  # define main sprite, with tile width and height
  spriteSheet: resources.spriteSheet imgPath, 32, 48
  init: (game, x, y, settings) ->
    @parent game, x, y, settings
    @addSprite 'walk', 0.1, [ 30, 31, 32, 31 ]
}

window.webGLStart = ->
  # game.main(document.getElementById "game-canvas")
  game.main "#game-canvas"

# vim:ts=2 sw=2
