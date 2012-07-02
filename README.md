# cc.gamer
A sprite based HTML5 game engine with WebGL and canvas backends.

# installation
To install globally:
```
sudo npm install -g cc.gamer
```

# about cc.gamer

After trying a dozen open source html5 game engines I couldn't find one that was simple, bug free, extensible and fast. Most of them only seem to contain one of these criteria and the best two or three at the most. [ImpactJS](http://impactjs.com/) is great and does all that but unfortunately it is closed source :( cc.gamer provides a fully functional sprite based game environment with a liberal license (MIT). It has a fast WebGL backend for browsers that support it and will have a canvas fallback soon. The WebGL canvas can support things like arbitrary zoom in games and many sprites and effects.

This library is for creating retro sprite based games based on tiles but the WebGL backend does have support for 3D features.

It is written in CoffeeScript but distributed in both minified and readable compiled JavaScript formats neither of which depend on CoffeeScript in any way.

# usage

## starting out

cc.gamer uses the [cc.loader](http://github.com/nuisanceofcats/cc.loader) module system which provides a similar API to [ImpactJS' module system](http://impactjs.com/) but written in coffeescript and with several extensions. It isn't necessary to use it for your own project but if you wish you can read about it [here](http://github.com/nuisanceofcats/cc.loader). The part about using ccbaker may be of interest if you wish to deploy your game in minified form.

cc.gamer uses [cc.extend](http://github.com/nuisanceofcats/cc.extend) to structure its classes. This provides an API similar to [ImpactJS' class system](http://impactjs.com/) but written in coffeescript and without support for singletons.

cc.gamer games use an instance of the Resources class from which to load resources instead of using singletons. cc.gamer also relies much less on global data with most game state being a member of the main game class. Object references are used to pass references to game state around.

## first game with cc.gamer

TODO

# status
* Module system: done
* Class system: done [cc.extend](http://github.com/nuisanceofcats/cc.extend)

# testing
```
% git clone git://github.com/nuisanceofcats/cc.gamer.git
% cd cc.gamer
% npm test
cc.gamer test server listening on: 8014
please go to http://localhost:8014/
```

# status
* Module system: done [cc.loader](http://github.com/nuisanceofcats/cc.loader)
* Class system: done [cc.extend](http://github.com/nuisanceofcats/cc.extend)
* WebGL backend: in progress
    * Spritesheet Animation: part done
    * Pushing many Spritesheets into a WebGL texture: part done
    * Shader API for sprites: part done
* Canvas backend: to do
* Core API: part done
* Resource loading/caching: part done
* Entity: part done
* Loading Screen: to do
* Game map: to do
* Physics: to do
* Input: to do
