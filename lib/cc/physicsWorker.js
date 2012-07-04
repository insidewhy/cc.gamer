// bootstrap for cc/gamer.js
document = { getElementsByTagName: function() { return [null] } }
function HTMLElement() {}
window = self

// this function is built-in to web workers
importScripts('gamer.js')

worker = new cc.PhysicsWorker()
