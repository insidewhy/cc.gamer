cc.module('cc.Timer').defines -> @set cc.Class.extend {
  # do not call.. use game.timer
  # duration = time in seconds until expiry
  init: (@_game, duration = 0) -> @expiresIn duration; return
  expiresIn: (@duration) -> @expires = @_game.now + @duration ; return
  expired: -> @_game.now >= @expires
  delta: -> @game.now - @expires
  reset: -> @expiresIn @duration
}
# vim:ts=2 sw=2
