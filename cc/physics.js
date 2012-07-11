// bootstrap for cc/gamer.js
document = { getElementsByTagName: function() { return [null] } }
function HTMLElement() {}
window = self

// this function is built-in to web workers
importScripts('gamer.js')

// everything begins with b2 anyway I'm cool without these namespaces
self.b2World        = Box2D.Dynamics.b2World
self.b2FixtureDef   = Box2D.Dynamics.b2FixtureDef
self.b2Vec2         = Box2D.Common.Math.b2Vec2
self.b2BodyDef      = Box2D.Dynamics.b2BodyDef
self.b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
self.b2Body         = Box2D.Dynamics.b2Body

worker = new cc.PhysicsWorker()
