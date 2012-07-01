# resource loader
resources = new cc.Resources

# bundles all spritesheets into one huge gl texture
texAtlas = new cc.TextureAtlas

rndr = new cc.Renderer

# offset into canvas texture cache of current tilesheet
tileCoord = vec2.createFrom 0, 0

imgPath = 'chars.png'
spriteHeight = 48.0
spriteWidth = 32.0

gl = null

Game = cc.Game.extend {
  # called when game has started
  booted: (_gl) ->
    gl = _gl
    rndr.start gl, game.scale

    @hero = @spawnEntity HeroEntity, 0, 0

    do initBuffers
    texAtlas.addSpriteSheet resources.spriteSheets[imgPath]
    texAtlas.loadImageToTexture gl
    rndr.shdr.activateTexture texAtlas

    # TODO: move elsewhere
    # surface attribute
    gl.bindBuffer gl.ARRAY_BUFFER, squareVertexPositionBuffer
    gl.vertexAttribPointer rndr.shdr.a.vertexPosition,
      squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0

  update: ->
    # TODO: move drawScene/animate into framework
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    # change tilesheet offset
    do @hero.update

    rndr.shdr.selectTile tileSize, @hero.activeSprite.tile, tileCoord

    # draw
    rndr.shdr.drawAt 0.0, 0.0
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    rndr.shdr.drawAt 10, 0, -158
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    rndr.shdr.drawAt 10.0, 0, 0
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    rndr.shdr.drawAt 110, 0, 0
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    rndr.shdr.drawAt 100, 0
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    # one with a small one on top
    rndr.shdr.drawAt 140, 0, -128
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    rndr.shdr.drawAt 140, 0
    gl.drawArrays gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems

    do @parent
}

game = new Game resources, scale: 2

# tile size (as percentage of sheet width)
tileSize = vec2.createFrom spriteWidth / texAtlas.width,
                           spriteHeight / texAtlas.height

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
