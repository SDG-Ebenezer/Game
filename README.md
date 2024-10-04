# Game
A multiplayer game that uses Socket.io, Express, and Node.js.
This import does not include the node.js automatically downloaded packages. So, in order to run, you must have node.js.
Socket version is 4.7.4.
Automatically generated .json files are also not included.
Commands like:
`npm init`
`npm install express`

# How the Game Works - A breakdown
**The Canvas**
The main game canvas (ctx) is set as the actual drawing of the game play. 
An additional canvas (gctx) is added to draw for game details, "game-ctx". This canvas controls things that are drawn in a canvas but not moving around with the player, such as a player's health bars and inventory slots.
**The Server-Client Communication**
In a loop, the client side constantly calls for information from the server to draw the canvas. This includes the player, enemies, trees, etc. The server responds by sending game data within the vinicity of the player as well as changing variables, such as the leaderboard. Data sent from the server is then used to draw on the client's (ctx) canvas and update game features.
The server controls damaging**, enemy decisions, generation, and spawning. The user's control movement of their players which is updated on the server side during the game loop calls. This allows players to update during multiplayer situations.
Each player is stored in the server by a custom ID in an "entities" object. This is the players database. Once a user presses the "Play" button, a new Player() is added to the database with an ID.

**Damage is dealt by 1) a click -- all player/entities in the "clicked" region receive damage, 2) projectiles -- the server controls a projectile's path until it reaches a player where it collides and is deleted or it is dropped, 3) enemy damages by checking if a player is in front of/over an enemy (based on x,y)
