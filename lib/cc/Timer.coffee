# Like the SyncTimer but time expiry duration always relates to the
# time the Timer was constructed or reset.
cc.module('cc.Timer').parent('cc.SyncTimer').jClass {
  # TODO: offset
  # do not call.. use game.timer
  init: (@_game, @duration) -> @reset() ; return
  reset: -> @expires = @_game.now + @duration ; return
}
