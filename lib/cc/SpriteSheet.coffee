cc.module('cc.SpriteSheet').defines -> @set cc.Class.extend {
  # not to be called externally!! use Resources
  init: (path, @width, @height, onload) ->
    @image = new cc.Image path, onload
}
# vim:ts=2 sw=2
