cc.module('cc.Surface').defines -> @set cc.Class.extend {
  init: (sheet, tileIdx, @x, @y, @width, @height) ->

  compressedPhysics: -> [ @x, @y, @width, @height ]

  draw: ->
    # TODO:
}
# vim:ts=2 sw=2
