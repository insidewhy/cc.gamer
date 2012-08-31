# cc.gamer
A high performance sprite based open source HTML5 game engine. It uses WebGL if available for graphics and takes advantage of multiple core processors by using Web Workers when available. Super accurate physics using Box2D are provided.

# examples

* [Sprites, Gravity, Controls and Sprite Masks](http://ccg.chilon.net)

# installation
Source files:

* [http://ccg.chilon.net/cc/gamer.js](http://ccg.chilon.net/cc/gamer.js)
* [http://ccg.chilon.net/cc/physics.js](http://ccg.chilon.net/cc/physics.js)

The physics.js has to be distributed in a separate file to run in the Web Worker API.

To include in a web page:

```html
<script source="cc/gamer.js"></script>
```

In order to take advantage of multi-core CPUs you must download the files and host them on your own server. Otherwise single-threaded mode can be used with the following line:

```html
<script source="http://ccg.chilon.net/cc/gamer.js"></script>
```

To install globally on your system using npm:
```
sudo npm install -g cc.gamer
```

# about cc.gamer

After trying a dozen open source html5 game engines I was disappointed than none seemed as good as the commercial effort [ImpactJS](http://impactjs.com/). cc.gamer provides a fully functional sprite based game environment with a liberal license (MIT). It has a fast WebGL graphics backend for browsers that support it and will have a canvas fallback soon. The physics engine runs in a Web Worker process to avoid blocking the graphics engine and to take advantage of processors with multiple cores.

This library is for creating retro sprite based games based on tiles but the WebGL backend does have support for some 3D features.

It is written in CoffeeScript but distributed in both minified and readable compiled JavaScript formats neither of which depend on CoffeeScript in any way.

# usage

## starting out

cc.gamer uses the [cc.loader](http://github.com/nuisanceofcats/cc.loader) module system which provides a similar API to [ImpactJS' module system](http://impactjs.com/) but written in coffeescript and with several extensions. It isn't necessary to use it for your own project but if you wish you can read about it [here](http://github.com/nuisanceofcats/cc.loader). The part about using ccbaker may be of interest if you wish to deploy your game in minified form.

cc.gamer uses [cc.extend](http://github.com/nuisanceofcats/cc.extend) to structure its classes. This provides an API similar to [ImpactJS' class system](http://impactjs.com/) but written in coffeescript and without support for singletons.


## first game with cc.gamer

cc.gamer games use an instance of the Resources class to load sprites, sound and...

TODO describe cc.Resources

# testing
```
% git clone git://github.com/nuisanceofcats/cc.gamer.git
% cd cc.gamer
% npm test
cc.gamer test server listening on: 8014
please go to http://localhost:8014/
```

# developing
```
% npm test
```

The test system will automatically reload and re-generate cc/gamer.js as you edit the code.

# dependencies
All dependencies are included in cc.gamer.js. They incude the excellent:

* [box2d-js](http://code.google.com/kripken/box2d.js)
* [gl-matrix](https://github.com/toji/gl-matrix)

# status
* Module system: done [cc.loader](http://github.com/nuisanceofcats/cc.loader)
* Class system: done [cc.extend](http://github.com/nuisanceofcats/cc.extend)
* WebGL backend: in progress
    * Spritesheet Animation: done
    * Pushing many Spritesheets into a WebGL texture: done
    * Shader API for entities: done
    * Shader API for surfaces
        * tessellating tiles: done
        * tile coverings/corners: todo
* Canvas backend: to do
* Resource loading/caching: done
* Physics (using Box2D js):
    * Run physics engine in web worker: done
* Entity:
    * Masks to control what Entities can collide: done
    * Velocity/Position/Acceleration updating: done
    * Spritesheet animations: done
    * Optional hitbox: done
    * Detect if entity is standing on surface (box2d sensor under feet): done
    * Physics:
        * Collision detection: done
        * Collision events: todo
        * Set velocity: done
        * Initial position: done
        * Teleport position: todo
        * Gravity: done
        * Acceleration: todo
* Input: done
* Surface: done
* Loading Screen: to do

# notes
* The box2d web project (which is a port of action script's box2d) seems to provide the best performance. cc.gamer also works with the box2d 2.2 port from llvm bytecode via emscripten in the "emscripten" branch.

# links
* [Box2D: constant speed](http://www.iforce2d.net/b2dtut/constant-speed)
* [Box2D: jumping](http://www.iforce2d.net/b2dtut/jumping)
