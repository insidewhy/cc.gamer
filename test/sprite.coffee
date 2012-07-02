# resource loader
resources = new cc.Resources

Game = cc.Game.extend {
  backgroundColor: [1.0, 0.72, 0.0, 1.0] # a nice orange

  # called after all resources have loaded
  booted: ->
    @hero = @spawnEntity HeroEntity, 0, 0
    return

  draw: ->
    do @parent
    do @hero.draw # entity draws sprite at bottom left

    # take advantage of the fact that the previous hero draw has left
    # its image in the gl texture attribute and draw some more copies
    # var various locations
    @renderer.drawSprite 10, 0, -158
    @renderer.drawSprite 10.0, 0
    @renderer.drawSprite 110, 0
    @renderer.drawSprite 100, 0
    @renderer.drawSprite 140, 0, -128
    @renderer.drawSprite 140, 0

  update: ->
    # TODO: should be done by game loop
    do @parent
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
