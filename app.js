const { spawn } = require("child_process")
var express = require("express")
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
        kind:"Hand",
        pic:false,
        durability:Infinity,
        maxDurability:Infinity,
        damage:5,
        generationProbability:0 //out of 100
    },
    "Iron_Sword":{
        name:"Iron_Sword",
        kind:"Sword",
        pic:"/imgs/Sword.png",
        durability:30,
        maxDurability:30,
        damage:25,
        generationProbability:50 //out of 100
    },
    "Gold_Sword":{
        name:"Gold_Sword",
        kind:"Sword",
        pic:"/imgs/Sword2.png",
        durability:20,
        maxDurability:20,
        damage:50,
        generationProbability:30 //out of 100
    },
    "Diamond_Sword":{
        name:"Diamond_Sword",
        kind:"Sword",
        pic:"/imgs/Sword3.png",
        durability:60,
        maxDurability:60,
        damage:30,
        generationProbability:10 //out of 100
    },
    "Plasma_Sword":{
        name:"Plasma_Sword",
        kind:"Sword",
        pic:"/imgs/Sword4.png",
        durability:100,
        maxDurability:100,
        damage:100,
        generationProbability:1 //out of 100
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
    constructor(username, imgSrc="/imgs/Player.png", type="player", speed=5, w=entitySize, h=entitySize, x=random(mapSize/2,-mapSize/2), y=random(mapSize/2,-mapSize/2), health = 100){
        super(type, imgSrc, speed, w, h, x, y, health)
        this.username = (username == "")?"Happy":username;
        this.xp = 0;
        this.inventory = [
            {...holdableItems["Iron_Sword"]},
            {...holdableItems["Hand"]},
            {...holdableItems["Hand"]},
            {...holdableItems["Hand"]},
            {...holdableItems["Hand"]},
        ];
        this.invSelected = 0
        this.hitRange = 100
    }
}
class Enemy extends Entity{
    constructor(type, imgSrc, damage, detectRange, reloadTime, speed=1, w=entitySize, h=entitySize, x=random(mapSize/2,-mapSize/2), y=random(mapSize/2,-mapSize/2), health = 100){
        super(type, imgSrc, speed, w, h, x, y, health)
        this.detectRange = detectRange
        this.damage = damage
        this.targetPlayer

        this.dx = 0;
        this.dy = 0;
        
        this.justAttacked = false
        this.cooldownTime = 0 //s
        this.cooldownDuration = reloadTime //ms
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
        
        //let panCoords = wallCheck(this.xInc, this.yInc, this.x, this.y)
        // UPDATE
        this.x += this.xInc//panCoords[0]; //xInc
        this.y += this.yInc//panCoords[1]; //yInc
        this.rotation = Math.atan2(this.yInc, this.xInc) + Math.PI
        // Check for damage
        if(distanceToPlayer < entitySize/2 && !this.justAttacked){
            entities[this.targetPlayer.id].health -= this.damage
            this.justAttacked = true
        }
        /*
        if (distanceToPlayer < entitySize) {
            if(this.hit == null) {
                this.hit = setInterval(() => {
                        this.targetPlayer.health -= this.damage // DAMAGE
                        if(this.targetPlayer.health <= 0) {
                            clearInterval(this.hit)
                            this.hit = null
                            console.log(this.targetPlayer.id)
                        }
                }, 1000/this.hitsPerS); // cooldown
            }
        }
        else{
            clearInterval(this.hit)
            this.hit = null
        }*/
    }
}
class Tree {
    constructor(treesID) {
        this.x = random(mapSize/2, -mapSize/2);
        this.y = random(mapSize/2, -mapSize/2);
        this.id = `TREE${treesID}`;
        this.isCircle = true;
        this.color = "rgb(0, 95, 0, 0.3)";
        this.size = random(125,100);
    }
}
class Wall {
    constructor(wall, structureID, wallImgSize) {
        this.x = wall.relX;
        this.y = wall.relY;
        this.id = `WALL${structureID}`;
        this.imgSrc = "/imgs/Wall.png";
        this.width = wallImgSize;
        this.height = wallImgSize;
    }
}

class Pickable{
    constructor(id, x,y,kind,imgSrc,hold=null,rotation=0,durability=1){
        this.id = id
        this.x = x
        this.y = y
        this.kind = kind //
        this.type = "pickable"
        this.imgSrc = hold?holdableItems[hold].pic:imgSrc
        this.width = this.height = 50
        this.holdableItemsCorr = hold
        this.rotation = rotation
        this.durability = durability
    }
}

/** @default_pickables */
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
            pickables[pickablesID] = new Pickable(pickablesID,x,y,slot.kind,null,slot.name,0,slot.durability)
            pickablesID ++
        }
    })}
}

/** @spawn_enemies */
let currEnemyID = 0
let enemyCount = 0
function spawnNormal(){
    enemies[currEnemyID] = new Enemy("Normal", "/imgs/Enemy.png", 5, 200, 50, 1)
    currEnemyID++
    enemyCount++
}
function spawnLord(){
    enemies[currEnemyID] = new Enemy("Lord", "/imgs/Enemy_Lord.png", 20, 500, 100, 1/2)
    currEnemyID++
    enemyCount++
}
/** @game_loop */
//server "game loop"
var amountOfBerries = 0
setInterval(()=>{
    if(enemyCount < 10){
        if(random(1000, 1) = 1){
            if(random(10,1)==1) spawnLord()
            else spawnNormal()
        }
    }
    for(let e in enemies){
        enemies[e].move()
        if(enemies[e].health <= 0) {
            enemyCount -= 1
            if(random(10, 1) == 1){
                pickables[pickablesID] = new Pickable(pickablesID, enemies[e].x, enemies[e].y, "Sword", null, "Iron_Sword",0,holdableItems["Iron_Sword"].durability)
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

    if(random(1000,1)==1 && amountOfBerries < mapSize/entitySize){
        if(random(10, 1) == 1){
            pickables[pickablesID] = new Pickable(pickablesID, random(mapSize/2,-mapSize/2), random(mapSize/2,-mapSize/2), "Sword", null, "Gold_Sword",0,holdableItems["Gold_Sword"].durability)
        }
        else{
            pickables[pickablesID] = new Pickable(pickablesID, random(mapSize/2,-mapSize/2), random(mapSize/2,-mapSize/2), "XP", "/imgs/Berry.png")
            amountOfBerries ++
        }
        pickablesID ++
    }
}, fps)

//ADD TREES
var trees = {} 
var treesID = 0
for(let i = 0; i < 1000; i ++){
    let newTree = new Tree(treesID)
    trees[treesID] = newTree
    treesID++
}

//ADD STRUCTURES
var structures = {}
var structureID = 0
var structureW = random(4,2)
var structureH = random(4,2)
var structureBlueprint = []
var wallSize = 100
var wallImgSize = wallSize * 1.35
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
        if(wall.isWall){
            structures[structureID] = new Wall(wall, structureID, wallImgSize)
            structureID++;
        }
    }
}

//SOCKET HANDLER
//what to do when a player connects
var io = require("socket.io")(serv,{})
io.sockets.on("connection", (socket)=>{
    var id
    console.log("New Socket Connection")
    //
    socket.on("askForStartData", function(data){
        let player = new Player(data.username, `/imgs/${data.img}.png`)
        
        id = player.id
        entities[id] = player //add player to pool
        socket.emit("sendStartData", {
            bordersObj:BORDERS,
            structuresObj: structures,
            player:player,
            mapSize:mapSize,
            entitySize:entitySize,
            fps:fps
        })
        console.log("Player ", player.username, player.id, "joined the server.")
    })  

    //update player (all vital info)
    socket.on("updatePlayer", (player)=>{
        try{
            if(player.id) {
                //console.log(player.id, entities)
                entities[player.id].x = player.x
                entities[player.id].y = player.y
                entities[player.id].rotation = player.rotation
                entities[player.id].invSelected = player.invSelected
                entities[player.id].speed = player.speed
            }
        } catch(err){
            console.log("Strange player spotted by the ID of ", player.id)
        }
    })
    //give data if requested
    socket.on("requestUpdateDataFromServer", (data)=>{
        let updateContent = [borderRect] //always have the border 
        let reach = 500
        //should we load?
        let stuffToLoad = [entities, enemies, structures, pickables, trees]
        stuffToLoad.forEach(group=>{
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
            updateContent:updateContent,
            player:entities[data.id]
        })
        
        //only if player exists and is alive
        if(entities[data.id] && entities[data.id].health <= 0) {
            socket.emit("gameOver")
            dropAll(data.id)
            delete entities[data.id]
        }
    })

    //player eat/pick up, etc.!
    socket.on("eat", (data)=>{
        let item = data.what
        let player = entities[id]
        if(player){
            if(item.kind == "XP"){
                player.xp ++
                amountOfBerries ++
                delete pickables[item.id]
            }
            else if(item.kind == "Sword"){
                let inv = player.inventory
                for(let i in inv){
                    if(inv[i].name == "Hand") {
                        player.inventory[i] = {...holdableItems[item.holdableItemsCorr]}
                        player.inventory[i].durability = item.durability
                        delete pickables[item.id]
                        break
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
            pickables[pickablesID] = new Pickable(pickablesID, x, y, item.kind, null, item.name,0,item.durability)
            entities[id].inventory[player.invSelected] = {...holdableItems["Hand"]}
            pickablesID++
        }
    })

    //BREAK TOOL 
    socket.on("breakTool", function(invSelected){
        entities[id].inventory[invSelected] = {...holdableItems["Hand"]}
    })

    //deal damage?
    socket.on("mousedown", function(data){
        let player = entities[id]
        if(player){
            let didDamage = false
            for(let e in entities){     
                let entity = entities[e]             
                if(Math.sqrt(Math.pow(entity.x - player.x, 2) + Math.pow(entity.y - player.y, 2)) < player.hitRange){
                    if(entity.id != id
                    && Math.abs(entity.x - data.x) < entitySize
                    && Math.abs(entity.y - data.y) < entitySize){
                        entity.health -= data.damage
                        didDamage = true // turn to true
                    }
                }
            }
            for(let e in enemies){     
                let enemy = enemies[e] 
                if(Math.sqrt(Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2)) < player.hitRange){      
                    if(Math.abs(enemy.x - data.x) < entitySize
                    && Math.abs(enemy.y - data.y) < entitySize){
                        enemy.health -= data.damage
                        didDamage = true // turn to true
                    }
                }
            }
            if(didDamage && data.tool.name != "Hand"){
                entities[id].inventory[data.invSelected].durability -= 1
            }
        }
    })

    //disconnect
    socket.on('disconnect', function() {
        try{
            console.log(`${entities[id].username} ${id} disconnected`)
            dropAll(id)
            delete entities[id]
        }
        catch(err){
            console.log("A suspicious looking player left...")
            dropAll(id)
            delete entities[undefined]
        }
    })
})