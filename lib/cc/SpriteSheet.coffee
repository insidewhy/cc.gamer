cc.module('cc.SpriteSheet').defines -> @set cc.Class.extend {
  textureOffset:   null # for webgl.. offset into texture atlas
  textureTileSize: null # for webgl.. size of tile in texture coordinates

  # not to be called externally!! use Resources
  init: (path, @tileWidth, @tileHeight, onload, @offset) ->
    # @offset is of spritesheet within a larger sprite sheet or GL texture
    # and is optional
    @image = new cc.Image path, onload

  imgWidth: -> @image.data.width
  imgHeight: -> @image.data.height
}
# vim:ts=2 sw=2
