# Game
A multiplayer game using Socket.io, Express, and Node.js. Has enemies and you can have usernames and skins. Currently, no XP, swords are being worked on as well as boss mobs.

# Disclaimer
This import does not include the node.js automatically downloaded packages. So, in order to run, you must have node.js.
Socket version is 4.7.4.
Automatically generated .json files are also not included.
Commands like:
`npm init`
`npm install express`

# How the Game Works - A breakdown
Define a canvas serving as a dynamic viewport, constantly centered around player.x, .y. Updates to this canvas occur upon data reception from the server, including World data. Loading data is conditional, based on proximity to the player's xy coordinates.

Client-side controls manage movement and inventory organization. Server-side operations handle adversaries, projectiles, damage, experience points, and loot generation.

In the server, all items are accounted for in objects, entities, drops, trees, etc. When a player asks for data, only the items within the vicinity of the player are sent back, to increase update speed and maintain faster gameplay.

Player IDs are provided by the server upon socket entry. Updates are initiated by client request emittions, forwarding player data to the server. Server-side entity manipulation includes partial updates, with final player information relayed back. The server then sends back the corrosponding data to the player.
