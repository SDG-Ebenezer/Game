const { spawn } = require("child_process")
const { log } = require("console")
var express = require("express")
const { Socket } = require("socket.io")
var app = express()
var serv = require("http").Server(app)

app.get("/", function(req, res){
    res.sendFile(__dirname + "/client/index.html")
})
app.use("/imgs", express.static(__dirname + "/client/imgs"));
app.use("/client", express.static(__dirname + "/client"))

const PORT = process.env.PORT || 1111 //server PORT
serv.listen(PORT)
console.log("Online @ " +PORT)

//RANDOM
var random = (max, min) => Math.floor(Math.random() * (max - min + 1)) + min
//CREATE NEW IDs
function createID(){
    /*GENERATE ID*/
    id = random(100000000000000, 0) //rand id
    while (id in ids){id = random(100000000000000, 0)}
    ids.push(id) //keep track of all ids
    return id
}
var pickables = {} //stuff, like XP, berries, etc.
const holdableItems = {
    "Hand":{
        name:"Hand",
        class:"Hand",
        pic:false,
        durability:Infinity,
        maxDurability:Infinity,
        damage:5,
        generationProbability:0, //out of 100
        rotation:0,
        stackSize:0,
        maxStackSize:0,
        cost: Infinity, //market value
    },
    "Iron Sword":{
        name:"Iron Sword",
        class:"Sword",
        pic:"/imgs/Sword.png",
        durability:30,
        maxDurability:30,
        damage:25,
        generationProbability:50, //out of 100
        rotation:-45/57.1,
        stackSize:1,
        maxStackSize:1,
        cost: 500, //market value
    },
    "Gold Sword":{
        name:"Gold Sword",
        class:"Sword",
        pic:"/imgs/Sword2.png",
        durability:20,
        maxDurability:20,
        damage:30,
        generationProbability:30, //out of 100
        rotation:-45/57.1,
        stackSize:1,
        maxStackSize:1,
        cost: 1000, //market value
    },
    "Diamond Sword":{
        name:"Diamond Sword",
        class:"Sword",
        pic:"/imgs/Sword3.png",
        durability:60,
        maxDurability:60,
        damage:40,
        generationProbability:10, //out of 100
        rotation:-45/57.1,
        stackSize:1,
        maxStackSize:1,
        cost: 1500, //market value
    },
    "Plasma Sword":{
        name:"Plasma Sword",
        class:"Sword",
        pic:"/imgs/Sword4.png",
        durability:100,
        maxDurability:100,
        damage:50,
        generationProbability:1, //out of 100
        rotation:-45/57.1,
        stackSize:1,
        maxStackSize:1,
        cost: 10_000, //market value
    },
    "Arrow":{
        name:"Arrow",
        class:"Arrow",
        pic:"/imgs/Arrow.png",
        durability:Infinity,
        maxDurability:Infinity,
        damage:5,
        generationProbability:75, //out of 100
        rotation:0,
        stackSize:1, //start out stack Size
        maxStackSize:64,
        cost: 50, //market value
    },
    "Bow":{
        name:"Bow",
        class:"Bow",
        pic:"/imgs/Bow.png",
        loadedBowPic:"/imgs/Bow_And_Arrow.png",
        durability:100,
        maxDurability:100,
        damage:5,
        generationProbability:10, //out of 100
        rotation:270/57.1,
        stackSize:1,
        maxStackSize:1,
        cost: 1500, //market value
    }
}

var ids = [] //player ids
const mapSize = 4096
var BORDERS = {
    "L" : -mapSize/2,
    "U" : mapSize/2,
    "R" : mapSize/2, 
    "D" : -mapSize/2  
}
var borderRect = {
    id:"BorderRect",
    x:-mapSize/4,
    y:-mapSize/4,
    width:mapSize,
    height:mapSize,
    isRect:true,
    color:"rgb(34, 60, 33)"
}
var fps = 1000/60 //

/** @STRUCTURES *****/
class Wall {
    constructor(wall, structureID, wallImgSize) {
        this.x = wall.relX;
        this.y = wall.relY;
        this.id = `WALL${structureID}`;
        this.imgSrc = random(5,1)==5?"/imgs/Mossy%20Wall.png":"/imgs/Wall.png";
        this.width = wallImgSize;
        this.height = wallImgSize;
    }
}
var structures = {}
var structureID = 0
var structureW = random(10, 6); // width
var structureH = structureW; // height (making it a square)
var structureBlueprint = []
var wallSize = 100
var wallImgSize = wallSize * 1.15
for(let r = 0; r < structureW; r++){
   structureBlueprint.push([])
   for(let c = 0; c < structureH; c++){
       structureBlueprint[r].push({
           isWall: random(1,0)==1?true:false,
           relX: r*wallSize,
           relY: c*wallSize})
   }
}
for(let r = 0; r < structureW; r++){
   for(let c = 0; c < structureH; c++){
       let wall = structureBlueprint[r][c];
       wall.x -= structureBlueprint.length/2
       if(wall.isWall){
           structures[structureID] = new Wall(wall, structureID, wallImgSize)
           structureID++;
       }
   }
}
/** @SPAWN_FINDER */
function findSpawn(size=0) {
    let s = size;
    let x, y;
    let doNotPass = true;
    while (doNotPass) {
        doNotPass = false; // be optimistic, you know?
        x = random(mapSize / 2 - s / 2, -mapSize / 2);
        y = random(mapSize / 2 - s / 2, -mapSize / 2);
        //cannot spawn on structures or markets 
        let li1 = [structures, markets]
        li1.forEach(obj=>{
            for (let sKey in obj) {
                let st = obj[sKey];
                let p = 3; // padding
                // Check for overlap
                if (
                    x + s > st.x - p &&
                    x - s < st.x + st.width + p &&
                    y + s > st.y - p &&
                    y - s < st.y + st.height + p
                ) {
                    doNotPass = true; // aww
                    break
                }
            }
        })
    }
    return { x: x, y: y };
}

/** @WALL_GENERATOR ********** */
var numOfRandomWalls = 10
for(let i = 0; i < numOfRandomWalls; i++){
    let a = findSpawn(wallSize)
    let nC = { relX: a.x, relY: a.y }
    structures[structureID] = new Wall(nC, structureID, wallImgSize)
    structureID++
}
//Function also in PLAYER js file~! But different
//HIT WALLS?
function checkCollision(walls, playerX, playerY, tx, ty) {
    let newX = playerX + tx;
    let newY = playerY + ty;
    for(let w in walls){
        let wall = walls[w]
        let wallX = wall.x - wall.width/2
        let wallY = wall.y - wall.height/2
        if (newX >= wallX &&
            newX <= wallX + wall.width &&
            wallY <= playerY && playerY <= wallY + wall.height) {
            tx = 0;
        }
        if (newY >= wallY &&
            newY <= wallY + wall.height &&
            wallX <= playerX && playerX <= wallX + wall.width) {
            ty = 0;
        }
    }
    return { tx: tx, ty: ty };
}

/** @MARKET *****/
var markets = {} //multiple market places
var marketID = 0
var marketSize = 200
class Market{
    constructor(x, y, ID, imgSize=marketSize) {
        this.x = x;
        this.y = y;
        this.id = ID;
        this.imgSrc = "/imgs/Market.png";
        this.width = imgSize;
        this.height = imgSize;
    }
}
for(let i = 0; i < 3; i ++){
    let coords = findSpawn(marketSize)
    let newMarket = new Market(coords.x, coords.y, marketID)
    markets[marketID] = newMarket
    marketID++
}

/** @TREES *****/
class Tree {
    constructor(treesID, size=random(125,100)) {
        let thing = {
            x:random(mapSize/2,-mapSize/2),
            y:random(mapSize/2,-mapSize/2)
        }
        this.x = thing.x;
        this.y = thing.y;
        this.id = `TREE${treesID}`;
        this.isCircle = true;
        this.color = "rgb(0, 95, 0, 0.3)";
        this.size = size
    }
}
var trees = {}
var treesID = 0
//Generate 1000 trees in the world...
for(let i = 0; i < 1000; i ++){
   let newTree = new Tree(treesID)
   trees[treesID] = newTree
   treesID++
}

/** @PICKABLES *****/
class Pickable{
   constructor(id,x,y,name,imgSrc,hold=null,rotation=0,durability=1,stackSize=1){
       this.id = id
       this.x = x
       this.y = y
       this.name = name //WARNING: THIS HAS TO EQUAL THE HOLDABLE ITEMS "KIND"/"NAME" IF A STACKABLE!! 
       this.type = "pickable"
       this.imgSrc = hold?holdableItems[hold].pic:imgSrc
       this.width = this.height = 50
       this.holdableItemsCorr = hold
       this.rotation = rotation
       this.durability = durability
       this.stackSize = stackSize
   }
}
var pickablesID = 0
//drop everything after death
function dropAll(id){
    let player = entities[id]
    if(player){
        player.inventory.forEach(slot=>{
            if(slot.name != "Hand"){
                let scatterRange = entitySize * 2 // area of scattering items
                let x = random(player.x + scatterRange, player.x - scatterRange)
                let y = random(player.y + scatterRange, player.y - scatterRange)
                if (x >= BORDERS.R || x <= BORDERS.L){x = 0}
                if (y >= BORDERS.U || y <= BORDERS.D){y = 0}
                pickables[pickablesID] = new Pickable(pickablesID,x,y,slot.name,null,slot.name,0,slot.durability,slot.stackSize)
                pickablesID ++
            }
        })
    }
}


/** @ENTITIES *****/
const entitySize = 75
var entities = {} //players info
var enemies = {} //monsters info

class Entity {
    constructor(type, imgSrc, speed, w, h, x, y, health) {
        this.id = createID();
        this.x = x;
        this.y = y;
        this.type = type;
        this.rotation = 0;
        this.health = health; //current health
        this.maxHealth = health; //max health
        this.showH = true
        this.imgSrc = imgSrc;
        this.isCircle = false;
        this.width = w;
        this.height = h;
        this.speed = speed;
        this.maxSpeed = speed
    }
}
class Player extends Entity{
    constructor(x, y, username, imgSrc="/imgs/Player.png", type="player", speed=5, w=entitySize, h=entitySize, health = 100){
        super(type, imgSrc, speed, w, h, x, y, health)
        this.username = (username == "")?"Happy":username;
        this.xp = 0
        this.kills = 0
        this.inventory = [
            {...holdableItems["Iron Sword"]},
            {...holdableItems["Bow"]},
            {...holdableItems["Arrow"]},
            {...holdableItems["Hand"]},
            {...holdableItems["Hand"]},
        ];
        this.invSelected = 0
        this.hitRange = 100
    }
}
class Enemy extends Entity{
    constructor(x, y, type, imgSrc, damage, detectRange, reloadTime, speed=1, health = 100, w=entitySize, h=entitySize){
        super(type, imgSrc, speed, w, h, x, y, health)
        this.username = "BOT_Enemy"
        this.detectRange = detectRange
        this.damage = damage
        this.targetPlayer
        this.dx = 0;
        this.dy = 0;      
        this.justAttacked = false
        this.cooldownTime = 0 //s
        this.cooldownDuration = reloadTime //ms
        this.lootTable = [
            {...holdableItems["Iron Sword"]}, 
            {...holdableItems["Gold Sword"]}, 
            {...holdableItems["Arrow"], stackSize:random(holdableItems["Arrow"].maxStackSize, 1)},
            {...holdableItems["Bow"]}, 
        ]
        this.xp = type=="Lord"?100:50
    }
    findTargetPlayer(){
        let minDist = Infinity;
        let closestIndex;
        for (let i in entities) {
            let plyr = entities[i]
            let dist = Math.sqrt(Math.pow(plyr.x - this.x, 2) + Math.pow(plyr.y - this.y, 2));
            if (dist < minDist && plyr.type == "player") {
                minDist = dist;
                closestIndex = i;
            }
        }
        if(entities[closestIndex]) this.targetPlayer = entities[closestIndex]
        else{this.targetPlayer = null}
    }
    damageCoolDown(){
        if(this.justAttacked){
            this.cooldownTime ++
            if(this.cooldownTime >= this.cooldownDuration) {
                this.cooldownTime = 0
                this.justAttacked = false
            }
            }
    }
    move() {
        this.findTargetPlayer()
        this.damageCoolDown()
        // Calculate the distance between the enemy and the user
        this.dx = this.dy = this.dist = 0
        var distanceToPlayer
        if(this.targetPlayer) {
            distanceToPlayer = Math.sqrt((this.targetPlayer.x - this.x) ** 2 + (this.targetPlayer.y - this.y) ** 2)
        }
        else {distanceToPlayer = Infinity}
        if(distanceToPlayer <= this.detectRange) { // Is player within range?
            this.status = "Attack"
            this.dx = this.targetPlayer.x - this.x;
            this.dy = this.targetPlayer.y - this.y;
            this.moving = true;
        } else if (!this.moving) {
            this.status = "Wander"
            this.targetX = random(mapSize/2,-mapSize/2)
            this.targetY = random(mapSize/2,-mapSize/2)
            this.dx = this.targetX - this.x;
            this.dy = this.targetY - this.y;
            this.moving = true;
            setTimeout(() => {
                this.moving = false;
            }, 10000); // Stay at the target location for 10 seconds
        } else {
            this.dx = this.targetX - this.x;
            this.dy = this.targetY - this.y;
            // if at destination, find new one
            if(this.dx < 1 && this.dy < 1) {
                this.targetX = random(mapSize/2,-mapSize/2)
                this.targetY = random(mapSize/2,-mapSize/2)
            }
        }           
        this.dist = Math.sqrt(this.dx ** 2 + this.dy ** 2);
        // Normalize the distance
        if(this.dist > 0){
            this.dx /= this.dist;
            this.dy /= this.dist;
        }
        this.xInc = this.dx * this.speed
        this.yInc = this.dy * this.speed
        //Can't go out of frame
        if (this.x + this.xInc > BORDERS.R || this.x + this.xInc < BORDERS.L){this.xInc = 0}
        if (this.y + this.yInc > BORDERS.U || this.y + this.yInc < BORDERS.D){this.yInc = 0}
        
        //CANT GO INTO WALLS
        let newCoords = checkCollision(structures, this.x, this.y, this.xInc, this.yInc)
        this.xInc = newCoords.tx
        this.yInc = newCoords.ty

        // UPDATE
        this.x += this.xInc//panCoords[0]; //xInc
        this.y += this.yInc//panCoords[1]; //yInc
        this.rotation = Math.atan2(this.yInc, this.xInc) + Math.PI
        // Check for damage
        if(distanceToPlayer < entitySize/2 && !this.justAttacked){
            let player = entities[this.targetPlayer.id]
            player.health -= this.damage
            //death message
            if(player.health <= 0){
                console.log(player.username, player.id, "was slain by a monster")
            }
            this.justAttacked = true
        }
    }
}

/** @ENEMY_GENERATOR ************* */
let currEnemyID = 0
let enemyCount = 0
function spawnNormal(){
    let nC = findSpawn(entitySize)
    enemies[currEnemyID] = new Enemy(nC.x, nC.y, "Normal", "/imgs/Enemy.png", 5, 400, 50, 1)
    currEnemyID++
    enemyCount++
}
function spawnLord(){
    let nC = findSpawn(entitySize)
    enemies[currEnemyID] = new Enemy(nC.x, nC.y, "Lord", "/imgs/Enemy_Lord.png", 20, 750, 100, 1/2, 500)
    currEnemyID++
    enemyCount++
}

/** @ARROWS */
var arrows = {}
class Arrow{
    constructor(x, y, dir, whoShot, flightDuration=50, speed=15){
        this.x = x
        this.y = y
        this.rotation = dir + Math.PI/2//for drawing (neds to be rotwated 90 deg)
        this.direction = dir //for direction purposes
        this.duration = flightDuration
        this.speed = speed

        this.imgSrc = "/imgs/Arrow.png"
        this.width = 50
        this.height = 50

        this.damage = 20

        this.whoShot = whoShot
    }
}

/** @SERVER_GAME_LOOOOOP ********** */
//server "game loop"
var amountOfBerries = 0
setInterval(()=>{
    //Spawn in enemies (chance of)
    if(enemyCount < 10){
        if(random(100, 1) == 1){
            if(random(10,1) == 1) spawnLord()
            else spawnNormal()
        }
    }
    //Move and update enemies' health
    for(let e in enemies){
        enemies[e].move()
        if(enemies[e].health <= 0) {
            enemyCount -= 1
            let pick = random(enemies[e].lootTable.length-1, 0) 
            //find if percentage beats
            if(random(100, 1) <= enemies[e].lootTable[pick].generationProbability){
                let loot = enemies[e].lootTable[pick]
                //chance if enemy dropping iron sword
                pickables[pickablesID] = new Pickable(pickablesID, enemies[e].x, enemies[e].y, loot.name, null, loot.name, 0, loot.durability, loot.stackSize)
                pickablesID++
            }
            delete enemies[e]
        }
    }

    //players regenerate
    for(let e in entities){
        let entity = entities[e]
        if(entity.health < entity.maxHealth){
            entities[entity.id].health += 0.01
        }
    }

    //add berries, swords, etc.
    if(random(1000,1)==1 && amountOfBerries < mapSize/entitySize){
        let spawnLocation = findSpawn()
        if(random(5, 1) == 1){
            pickables[pickablesID] = new Pickable(pickablesID, spawnLocation.x, spawnLocation.y, "Speed", "/imgs/SP.png")
            amountOfBerries ++
        } else{
            pickables[pickablesID] = new Pickable(pickablesID, spawnLocation.x, spawnLocation.y, "XP", "/imgs/Berry.png")
            amountOfBerries ++
        }
        pickablesID ++
    }

    //add loot 0.1% chance
    if (random(1000, 1) == 1) {
        let spawnLocation = findSpawn()
        let randomKey = Object.keys(holdableItems)[Math.floor(Math.random() * Object.keys(holdableItems).length)] // rand key in holdableItems
        let gProb = holdableItems[randomKey].generationProbability;
        let gen = random(100, 1) < gProb
        if (gen) {
            pickables[pickablesID] = new Pickable(
                pickablesID,
                spawnLocation.x,
                spawnLocation.y,
                holdableItems[randomKey].name,
                null,
                randomKey,
                0,
                holdableItems[randomKey].durability
            );
            pickablesID++
        }
    }

    //update arrows
    for(let key in arrows){
        let arrow = arrows[key]

        //CAN NEVER! go out of world and drop
        if(!(arrow.x > BORDERS.L && arrow.x < BORDERS.R && arrow.y > BORDERS.D && arrow.y < BORDERS.U)) {
            console.log("Yo out buddy", arrow.x > BORDERS.L && arrow.x < BORDERS.R, arrow.y > BORDERS.D && arrow.y < BORDERS.U)
            delete arrows[key] //!!
            break;
        }

        //if no more flight length
        if(arrow.duration <= 0) {
            pickables[pickablesID] = new Pickable(pickablesID, arrow.x, arrow.y, "Arrow", null, holdableItems["Arrow"].name, arrow.rotation ,holdableItems["Arrow"].durability, 1)
            pickablesID ++
            delete arrows[key] //!!
        } else {arrow.duration -= 1} //update

        //no hitty walls
        let nC = checkCollision(structures, arrow.x, arrow.y, arrow.speed * Math.cos(arrow.direction), arrow.speed * Math.sin(arrow.direction)) //check new coordinates
        //no going outta bounds
        if (!(arrow.x + nC.tx > BORDERS.L && arrow.x + nC.tx < BORDERS.R && arrow.y + nC.ty > BORDERS.D && arrow.y + nC.ty < BORDERS.U)){nC = {tx: 0, ty: 0}}
        //if it stopped, just drop 
        if(nC.tx == 0 || nC.ty == 0) {
            //drop arrow if hits
            pickables[pickablesID] = new Pickable(pickablesID, arrow.x, arrow.y, "Arrow", null, holdableItems["Arrow"].name, arrow.rotation,holdableItems["Arrow"].durability)
            pickablesID++
            delete arrows[key] //!!
        }
        //if it hasn't been dropped...
        arrow.x += nC.tx
        arrow.y += nC.ty

        //DAMAGE
        let damageAbles = [entities, enemies]
        damageAbles.forEach(obj=>{
            for(let k in obj){
                let entity = obj[k]
                //NOTE: offset by entitySize because players drawn are offcentered
                if(arrow.x > entity.x-entitySize/2 
                && arrow.x < entity.x + entity.width-entitySize/2
                && arrow.y > entity.y -entitySize/2
                && arrow.y < entity.y + entity.height-entitySize/2) {
                    entity.health -= arrow.damage
                    if(entity.health <= 0){
                        console.log(arrows[key].whoShot)
                        let whoShotIt = arrows[key].whoShot.username
                        let messageLi = [
                            `${whoShotIt} killed ${entity.username} with an arrow.`,
                            `${whoShotIt} shot ${entity.username}.`,
                            `The arrow from ${whoShotIt} found its mark on ${entity.username}.`,
                            `${entity.username} was sniped from afar by ${whoShotIt} with an arrow.`
                        ]
                        let shotArrowDeathMessageWording = messageLi[random(messageLi.length-1, 0)]
                        let player = entities[arrows[key].whoShot.id]
                        console.log(shotArrowDeathMessageWording)
                        player.xp += entity.xp
                        player.kills ++
                    }
                    delete arrows[key]
                    break
                }
            }
        })
    }
}, fps)


/** @SOCKET *****/
//what to do when a player connects
var io = require("socket.io")(serv,{})
io.sockets.on("connection", (socket)=>{
    var id
    console.log("New Socket Connection")
    socket.emit("allowUpdate") // allow to start
    //
    socket.on("askForStartData", function(data){
        let nC = findSpawn(entitySize)
        let player = new Player(nC.x, nC.y, data.username, `/imgs/${data.img}.png`)
        
        id = player.id
        entities[id] = player //add player to pool
        socket.emit("sendStartData", {
            bordersObj:BORDERS,
            structuresObj: structures,
            player:player,
            mapSize:mapSize,
            entitySize:entitySize,
            walls: Object.values(structures),
            markets: Object.values(markets),
            holdables: holdableItems
        })
        console.log("Player ", player.username, player.id, "joined the server.")
    }) 

    //update player (all vital info)
    socket.on("updatePlayer", (d)=>{
        let player = d.player
        if(entities[player.id]) {
            entities[player.id].x = player.x
            entities[player.id].y = player.y
            entities[player.id].rotation = player.rotation
            entities[player.id].invSelected = player.invSelected
            entities[player.id].speed = player.speed
            if(d.reorder) entities[player.id].inventory = player.inventory
        } else if(player.id && !entities[player.id]){
            id = player.id
            entities[id] = player
            console.log(entities[id].username, id, "was added to pool")
            socket.emit("reupdate", {
                bordersObj:BORDERS,
                structuresObj: structures,
                mapSize:mapSize,
                entitySize:entitySize,
                walls: Object.values(structures),
                markets: Object.values(markets),
            }) //re updates updated game data.
        }
    })

    //give data if requested
    socket.on("requestUpdateDataFromServer", (data)=>{
        let updateContent = [borderRect] //always have the border
        let reach = 500
        //should we load? (also order)
        let updateLi = [markets, entities, enemies, structures, pickables, arrows, trees]
        updateLi.forEach(group=>{
            for(let i in group){
                let item = group[i]
                if(Math.abs(item.x - data.x) < reach
                && Math.abs(item.y - data.y) < reach){
                    updateContent.push(item) //add to load
                }
            }
        })

        //if in range
        socket.emit("sendUpdateDataToClient", {
            updateContent: updateContent,
            player: entities[data.id],
            serverPlayerCount: Object.keys(entities).length,
            leaderboard: Object.values(entities)
            .sort((a, b) => b.kills - a.kills)
            .slice(0, 5)
            .map(player => ({ username: player.username, kills: player.kills, xp: player.xp, id: player.id })),  
        })
        
        //only if player exists and is alive
        if(entities[data.id] && entities[data.id].health <= 0) {
            socket.emit("gameOver")
            dropAll(data.id)
            delete entities[data.id]
        }
    })

    //player eat/pick up, etc.! ADD TO Inventory 
    socket.on("eat", (data)=>{
        let item = data.what
        let player = entities[id]
        if(player){
            if(item.name == "XP"){
                player.xp += random(10, 1)
                amountOfBerries -= 1
                delete pickables[item.id]
            } else if(item.name == "Speed"){
                player.xp += random(10, 1)
                amountOfBerries -= 1
                socket.emit("speed")
                delete pickables[item.id]
            } else {
                let inv = player.inventory;
                let taken = false //taken? picked up? etc.??
                //see if you already have it and group together
                for (let i in inv) {
                    // Check for stackable item
                    if(inv[i].name === item.name 
                    && inv[i].stackSize < inv[i].maxStackSize) {
                        if(pickables[item.id].stackSize + inv[i].stackSize > inv[i].maxStackSize){
                            let increase = inv[i].maxStackSize - (inv[i].stackSize)
                            inv[i].stackSize += increase //added to inv
                            pickables[item.id].stackSize -= increase //added to inv
                            item = pickables[item.id] //update item
                        }
                        else{
                            inv[i].stackSize += pickables[item.id].stackSize
                            delete pickables[item.id];
                            taken = true //set to TRUE                   
                            break;   
                        } 
                    } 
                }
                //put in hand if not taken
                if(!taken){
                    for (let i in inv) {
                        if (inv[i].name === "Hand") {
                            // Replace with new item
                            let nItem = { ...holdableItems[item.holdableItemsCorr]}
                            nItem.stackSize = item.stackSize
                            player.inventory[i] = nItem;
                            player.inventory[i].durability = item.durability;
                            delete pickables[item.id];
                            break;
                        }
                    }
                }
            }
        }
    })

    //player drop item
    socket.on("drop", (data)=>{
        let player = entities[id]
        let x = data.x
        let y = data.y
        //see if out of boundaries
        if (data.x <= BORDERS.L){
            x = BORDERS.L
        } else if(data.x >= BORDERS.R){
            x = BORDERS.R
        }
        if (data.y <= BORDERS.D){
            y = BORDERS.D
        } else if(data.y >= BORDERS.U){
            y = BORDERS.U
        }
        let item = player.inventory[data.playerInvI]
        if(item.name != "Hand"){
            pickables[pickablesID] = new Pickable(pickablesID, x, y, item.name, null, item.name, 0, item.durability, item.stackSize)
            entities[id].inventory[player.invSelected] = {...holdableItems["Hand"]}
            pickablesID++
        }
    })

    //deal damage or other mousedown events O.O 
    socket.on("mousedown", function(data){
        let player = entities[id]
        if(player){
            let tool = player.inventory[player.invSelected]
            //shoot arrow IF bow
            if (tool.name === "Bow") {
                // Check for arrow in inventory
                let canShoot = player.inventory.some(invSlot => invSlot.name === "Arrow");
            
                // Shoot arrow
                if (canShoot) {
                    let arrowDirection = player.rotation + Math.PI;
                    
                    arrows[createID()] = new Arrow(player.x + Math.cos(arrowDirection) * entitySize, player.y + Math.sin(arrowDirection) * entitySize, arrowDirection, player);
            
                    // Decrease arrow stack or remove from inventory
                    for (let slot = 0; slot < player.inventory.length; slot++) {
                        let invSlot = player.inventory[slot];
                        if (invSlot.name === "Arrow") {
                            if (invSlot.stackSize > 1) {
                                invSlot.stackSize -= 1;
                            } else {
                                player.inventory[slot] = { ...holdableItems["Hand"]};
                            }
                            break;
                        }
                    }

                    //damage bow
                    tool.durability -= 1
                }
            }   
            //melee attack         
            else {
                let didDamage = false
                let damage = (tool.durability != Infinity)?holdableItems[tool.name].damage:holdableItems["Hand"].damage
                for(let e in entities){    
                    let entity = entities[e]            
                    if(Math.sqrt(Math.pow(entity.x - player.x, 2) + Math.pow(entity.y - player.y, 2)) < player.hitRange){
                        if(entity.id != id
                        && Math.abs(entity.x - data.x) < entitySize
                        && Math.abs(entity.y - data.y) < entitySize){
                            entity.health -= damage
                            if(entity.health <= 0){
                                player.xp += entity.xp * 0.8 // give player xp
                                console.log(entity.username, entity.id, "was slain by", player.username, player.id)
                                
                                player.kills ++
                            }
                            didDamage = true // turn to true
                        }
                    }
                }
                for(let e in enemies){    
                    let enemy = enemies[e]
                    if(Math.sqrt(Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2)) < player.hitRange){     
                        if(Math.abs(enemy.x - data.x) < entitySize
                        && Math.abs(enemy.y - data.y) < entitySize){
                            enemy.health -= damage
                            if(enemy.health <= 0){
                                //give player xp for killed
                                player.xp += enemy.xp
                                player.kills ++
                            }
                            didDamage = true // turn to true
                        }
                    }
                }
                if(didDamage && tool.durability != null){
                    tool.durability -= 1 //DAMAGE Tool
                }
            }

            //BREAK TOOL? Is the tool too weak?
            if(player.inventory[player.invSelected].durability <= 0 
            && player.inventory[player.invSelected].durability!=null){
                console.log(player.inventory[player.invSelected])
                player.inventory[player.invSelected] = {...holdableItems["Hand"]}
            }
        }
    })

    //buy
    socket.on("buy", function(data){
        let player = entities[id]
        let boughtItem = data.item
        player.xp -= boughtItem.cost
        pickables[pickablesID] = new Pickable(pickablesID, player.x, player.y, boughtItem.name, null, boughtItem.name, 0, boughtItem.durability, boughtItem.stackSize)
        pickablesID ++ 
    })

    //disconnect
    socket.on('disconnect', function() {
        try{
            console.log(`${entities[id].username} ${id} disconnected`)
            delete entities[id]
        }
        catch(err){
            console.log("A player left the server and closed the tab...", id)
            delete entities[undefined]
        }
    })
})