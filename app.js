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
var maxLoad = 750 //most px a player can see (to cancel zoom out)
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
        hitRange: null
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
        hitRange: 175
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
        cost: 1500, //market value
        hitRange: 150
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
        cost: 3000, //market value
        hitRange: 150
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
        hitRange: 125
    },
    "Arrow":{
        name:"Arrow",
        class:"Arrow",
        pic:"/imgs/Arrow.png",
        durability:Infinity,
        maxDurability:Infinity,
        damage:20,
        generationProbability:75, //out of 100
        rotation:0,
        stackSize:1, //start out stack Size
        maxStackSize:64,
        cost: 25, //market value
        hitRange: null
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
        cost: 1000, //market value
        hitRange: maxLoad
    },
    "Spear":{
        name:"Spear",
        class:"Spear",
        pic:"/imgs/Spear.png",
        loadedBowPic:"/imgs/Spear.png",
        durability:5,
        maxDurability:5,
        damage:80,
        generationProbability:1, //out of 100
        rotation:270/57.1, //how looks like when held
        stackSize:1,
        maxStackSize:1,
        cost: 2500, //market value
        hitRange: maxLoad
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

/** @STRUCTURES *****/
class Wall {
    constructor(wall, id, wallSize) {
        this.x = wall.relX;
        this.y = wall.relY;
        this.class = "Wall"
        this.id = `WALL${id}`;
        this.imgSrc = random(5,1)==5?"/imgs/Mossy%20Wall.png":"/imgs/Wall.png";
        this.width = wallSize 
        this.height = wallSize 
        this.rotation = 0
    }
}
class Stairs {
    constructor(x, y, id, wallSize, rotation) {
        this.x = x;
        this.y = y;
        this.class = "Stairs"
        this.id = `STAIRS${id}`;
        this.imgSrc = "/imgs/Stairs.png";
        this.width = wallSize;
        this.height = wallSize;
        this.rotation = rotation
    }
}

var structures = {} //all, walls, stairs, etc.
var structuresID = 0

/** @MAIN_STRUCTURE */
/**Key:
 * S = Stairs
 * W = Wall
 * N = Space
 * E = Escape (Comes later after boss defeated)
 */
var structureBlueprint = [
    ["S", "W", "W", "W", "W", "W", "W", "S"],
    ["W", "E", "N", "N", "N", "N", "E", "W"],
    ["W", "N", "N", "N", "N", "N", "N", "W"],
    ["W", "N", "N", "N", "N", "N", "N", "W"],
    ["W", "N", "N", "N", "N", "N", "N", "W"],
    ["W", "N", "N", "N", "N", "N", "N", "W"],
    ["W", "E", "N", "N", "N", "N", "E", "W"],
    ["S", "W", "W", "W", "W", "W", "W", "S"]
]
var structureW = structureBlueprint[0].length; // width
var structureH = structureBlueprint.length; // height (making it a square)
var structureCenter = {x:0,y:0}
var wallSize = 100
var escapesData = [] //for boss defeats
for(let r = 0; r < structureW; r++){
    for(let c = 0; c < structureH; c++){
        let wall = {
            relX: r*wallSize-(structureW * wallSize)/2 + structureCenter.x,
            relY: c*wallSize-(structureH * wallSize)/2 + structureCenter.y
        }
        if(structureBlueprint[r][c] == "W"){
            structures[structuresID] = new Wall(wall, structuresID, wallSize)
            structuresID++;
        } else if(structureBlueprint[r][c] == "S"){
            structures[structuresID] = new Stairs(wall.relX, wall.relY, structuresID, wallSize, c==0?Math.PI:(Math.PI/180)) //make rotate based on corner
            structuresID++;
        } else if(structureBlueprint[r][c] == "E"){
            escapesData.push({x:wall.relX,y:wall.relY,r:r,c:c})
        }
    }
}

var escapesIDRoot = "Escapes"
var escapesIDs = []
function toggleOpeningsToArena(escapesLocked){
    if(!escapesLocked){
        let i = 0
        for(let e in escapesData){
            let obj = escapesData[e]
            let id = `${escapesIDRoot}${i}`
            structures[id] = new Stairs(obj.x, obj.y, id, wallSize, obj.r==1?270*(Math.PI/180):90*(Math.PI/180))
            escapesIDs.push(id)
            i++
        }
    } else{
        for(let i in escapesIDs){
            let id = escapesIDs[i]
            delete structures[id]
        }
        escapesIDs = []
    }
}

/** @LAKES */
/**
 * Take a swim! Cool off bud!
 */
var lakes = {}
class Lake{
    constructor(x, y, radius){
        this.x = x
        this.y = y
        this.size = radius
        this.radius = radius
        this.isCircle = true
        this.color = "#188B8F"

        this.decreaseSpeedFactor = 0.5 //slow speed
    }
}
//generate
let lakeCount = Math.floor(mapSize/1000)>0?Math.floor(mapSize/1000):1
console.log("Lakes:", lakeCount)
for(let i = 0; i < lakeCount; i++){
    let size = random(300,250)
    lakes[`LAKE${i}`] = new Lake(random(mapSize/2-size,-mapSize/2+size), random(mapSize/2-size,-mapSize/2+size), size)
}

/** @PARTICLES */
/**
 * Particles are for animation, when an object steps
 * in water, climbs walls?, etc. For animation purposes.
 */
var particles = {}
var particleTimeouts = {}
var particleFrequency = 400 // 
class Particle{
    constructor(x, y, radius=random(entitySize/2, entitySize/5)){
        this.x = x
        this.y = y
        this.duration = 95
        this.color = "#00000008"
        this.size = radius
        this.radius = radius

        this.isCircle = true
    }
}

/** @SPAWN_FINDER */
/**
 * Everyone needs a home!
 */
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
        for(let l in lakes){
            let lake = lakes[l]
            let distance = Math.sqrt(Math.pow(x - lake.x, 2) + Math.pow(y - lake.y, 2));
            if(distance <= lake.radius){
                doNotPass = true; // aww
                break
            }
        }
    }
    return { x, y };
}

/** @SMALL_STRUCTURE_GENERATOR ********** */
var numOfRandomWalls = random(10, 5)
for(let i = 0; i < numOfRandomWalls; i++){
    let blueprintSize = random(4,1)
    //make blueprint
    let blueprint = []
    for(let r = 0; r< blueprintSize; r++){
        blueprint.push([])
        for(let c = 0; c< blueprintSize; c++){
            /**Key:
             * S = Stairs
             * N = Nothing
             * W = Wall
             */
            possibleWalls = ["W", "W", "W", "W", "W", "N", "N", "N", "N", "S"] //1 "S" in 10 tries
            blueprint[r].push(possibleWalls[random(possibleWalls.length-1, 0)])
        }
    }
    //console.log(blueprint)

    let structureSize = blueprintSize * wallSize
    let a = findSpawn(structureSize)
    let allStairs = []
    //generate Structure
    for(let r = 0; r < blueprintSize; r++){
        for(let c = 0; c < blueprintSize; c++){
            let nC = { 
                relX: a.x+c*wallSize, 
                relY: a.y+r*wallSize 
            }
            if(blueprint[r][c] == "W"){
                structures[structuresID] = new Wall(nC, structuresID, wallSize)
                structuresID++
            } else if(blueprint[r][c] == "S"){
                allStairs.push({r:r,c:c,id:structuresID})
                structures[structuresID] = new Stairs(nC.relX, nC.relY, structuresID, wallSize, 0) //rotate none as a placeholder
                structuresID++
            }
        }
    }
    //rotate stairs accordingly
    for(let s in allStairs){
        let stair = allStairs[s]
        let rotate
        if(blueprint[stair.r+1] && blueprint[stair.r+1][stair.c]
        && blueprint[stair.r+1][stair.c] == "W")
        { rotate = 180 }
        else if (blueprint[stair.r-1] && blueprint[stair.r-1][stair.c]
        && blueprint[stair.r-1][stair.c] == "W")
        { rotate = 0 }
        else if (blueprint[stair.r][stair.c+1] 
        && blueprint[stair.r][stair.c+1] == "W")
        { rotate = 90 }
        else if (blueprint[stair.r][stair.c-1] 
        && blueprint[stair.r][stair.c-1] == "W")
        { rotate = 270 }
        else{ 
            //cant be a stair, because no adjacent walls!
            let old = structures[stair.id]
            structures[stair.id] = new Wall({relX:old.x,relY:old.y}, structuresID, wallSize)
            console.log("Stairs replaced.")
        }

        structures[stair.id].rotation = rotate * (Math.PI/180) //convert deg to rad
    }
}


//Function also in PLAYER js file~! But different
//HIT WALLS?
function checkCollision(walls, playerX, playerY, tx, ty, onWall, who, particlesTF, size=entitySize) {
    if(onWall) return { tx, ty }
    let newX = playerX + tx;
    let newY = playerY + ty;
    for(let w in walls){
        let wall = walls[w]
        if(wall.class == "Wall" && !onWall){
            let padding = size/2 
            let width = wall.width + padding
            let height = wall.height + padding 
            let wallX = wall.x - width/2
            let wallY = wall.y - height/2
            if (newX >= wallX &&
                newX <= wallX + width &&
                wallY <= playerY && playerY <= wallY + height) {
                tx = 0;
            }
            if (newY >= wallY &&
                newY <= wallY + height &&
                wallX <= playerX && playerX <= wallX + width) {
                ty = 0;
            }
        }
    }
    if (!onWall && particlesTF) {
        for (let l in lakes) {
            let lake = lakes[l];
            let distanceSquared = Math.pow(lake.x - playerX, 2) + Math.pow(lake.y - playerY, 2);
            if (distanceSquared <= Math.pow(lake.radius, 2)) {
                if(!particleTimeouts[who.id]){
                    particleTimeouts[who.id] = setTimeout(()=>{
                        delete particleTimeouts[who.id]
                    }, particleFrequency)
                    particles[createID()] = new Particle(playerX, playerY)
                }
                return { tx: tx * lake.decreaseSpeedFactor, ty: ty * lake.decreaseSpeedFactor };
            }
        }
    }    
    
    return { tx, ty };
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
    constructor(treesID, size=random(500,200)) {
        let thing = findSpawn(size)
        this.x = thing.x;
        this.y = thing.y;
        this.id = `TREE${treesID}`;
        //this.color = "rgb(0, 95, 0, 0.3)";
        this.width = size
        this.height = size
        this.imgSrc = `/imgs/Tree${random(1,3)}.png`
        this.rotation = random(0, 355) * (Math.PI/180)
    }
}
var trees = {}
var treesID = 0
//Generate 1000 trees in the world...
for(let i = 0; i < mapSize/25; i ++){
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
       this.despawnIn = 10000 // * fps sec
   }
}
var pickablesID = 0
//drop everything after death
/**
 * This function copies the inventory of an entity
 * in entities via the "id" parameter.
 */
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
        this.onWall = false //default
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
        this.hitSize = 40

        /** @NOTE!
         * This is to prevent players from not despawning 
         * when they are inactive or not on the page while
         * also allowing player to keep everything if the
         * server crashes and resets.
        */
        this.isDead = false
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
        /** @this.lootable - what it drops*/
        if(type == "Boss") {
            this.lootTable = [{...holdableItems["Diamond Sword"], generationProbability:100}] //boss mob gives diamond sword 100%
        } else{
            this.lootTable = [
                {...holdableItems["Iron Sword"]}, 
                {...holdableItems["Gold Sword"]}, 
                {...holdableItems["Arrow"], stackSize:random(holdableItems["Arrow"].maxStackSize, 1)},
                {...holdableItems["Bow"]}, 
            ]
        }
        /** @this.xp - how much xp this gives*/
        if(type == "Boss"){
            this.xp = 2500
        } else if(type == "Summoned_Lord"){
            this.xp = 500
        } else if(type == "Lord"){
            this.xp = 250
        } else{
            this.xp = 75
        }
        
        this.targetX = 0
        this.targetY = 0
    }
    findTargetPlayer(){
        let minDist = 10**10;
        let closestIndex;
        for (let i in entities) {
            let plyr = entities[i]
            let dist = Math.sqrt(Math.pow(plyr.x - this.x, 2) + Math.pow(plyr.y - this.y, 2));
            if (dist < minDist && plyr.type == "player" && plyr) {
                minDist = dist;
                closestIndex = i;
            }
        }
        if(closestIndex!=undefined && entities[closestIndex]) this.targetPlayer = entities[closestIndex]
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
        else {distanceToPlayer = 10**10}

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
        
        //update onWall
        let oW = false
        for(let w in structures){
            let wall = structures[w]
            let width = this.width/2
            let height = this.height/2
            if(wall.class == "Stairs"
            && this.x > wall.x-wall.width/2 
            && this.x < wall.x+wall.width/2
            && this.y > wall.y-wall.height/2
            && this.y < wall.y+wall.height/2
            && !this.onWall){
                oW = true;
                break;
            } else if(this.onWall){
                if((wall.class == "Wall" || wall.class == "Stairs")
                && this.x > wall.x-wall.width/2-width 
                && this.x < wall.x+wall.width/2+width
                && this.y > wall.y-wall.height/2-height 
                && this.y < wall.y+wall.height/2+height) {
                    oW = true
                    break;
                }
            }
        }
        this.onWall = oW

        //update
        let newCoords = this.onWall?
            {
                tx: this.xInc, 
                ty: this.yInc,
            }:
            checkCollision(structures, this.x, this.y, this.xInc, this.yInc, this.onWall, this, true, this.width==this.height?this.width:Math.max(this.width, this.height))
        this.xInc = newCoords.tx
        this.yInc = newCoords.ty

        // UPDATE
        this.x += this.xInc
        this.y += this.yInc
        this.rotation = Math.atan2(this.dy, this.dx) + Math.PI
        // Check for damage
        if(distanceToPlayer < entitySize/2 && !this.justAttacked){
            let player = entities[this.targetPlayer.id]
            player.health -= this.damage
            //death message
            if(player.health <= 0){
                console.log(player.username, player.id, this.type == "Boss"?"was bonked by the boss":"was slain by a monster")
            }
            this.justAttacked = true
        }
    }
}
class Boss extends Enemy{
    constructor(x=0, y=0, type="Boss", imgSrc="/imgs/Enemy_Elder.png", damage=50, detectRange=500, reloadTime=100, speed=1, health = 1000, w=entitySize, h=entitySize){
        super(x, y, type, imgSrc, damage, detectRange, reloadTime, speed, health, w, h)
        this.summonGuards = false
        this.summoned = 0
    }
    move(){
        if(this.health < this.maxHealth * 3/4){
            if(!this.summonGuards) this.summonInGuards()
        } else {
            super.move()
        }

        if(this.health == this.maxHealth){
            for(let e in enemies){
                if (enemies[e].type=="Summoned_Lord"){
                    delete enemies[e]
                    this.summonGuards = false
                    this.summoned = 0
                }
            }
        } else if (this.health < this.maxHealth){
            //regenerate!! >:)
            this.health += 0.1
        }
    }
    summonInGuards(){
        let spread = 100
        if(!this.summonGuards){
            this.summonGuards = true
            for(let i = 0; i < 2; i ++){
                let x = (i * spread) - spread
                for(let j = 0; j < 2; j ++){
                    let id = `@Summoned${i}${j}${random(65536,0)}`
                    let y = (j * spread) - spread
                    enemies[id] = new Enemy(x, y, "Summoned_Lord", "/imgs/Enemy_Lord.png", 20, 750, 100, 1/2, 500)
                    enemyCount++
                    this.summoned++
                }
            }
        }
    }
}

/** @ENEMY_GENERATOR ************* */
var currEnemyID = 0
var enemyCount = 0
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

var bossID = "Boss"
//var bossSpawned = false
toggleOpeningsToArena(true)
enemies[bossID] = new Boss()
enemyCount++

/** @projectiles */
var projectiles = {}
class Projectile{
    constructor(type, x, y, w, h, damage, dir, whoShot, durability, flightDuration=50, speed=15, imgSrc="/imgs/Arrow.png"){
        this.type = type //key inside holdable items!
        this.x = x
        this.y = y
        this.rotation = dir + Math.PI/2//for drawing (neds to be rotwated 90 deg)
        this.direction = dir //for direction purposes
        this.duration = flightDuration
        this.speed = speed

        this.imgSrc = imgSrc
        this.width = w
        this.height = h

        this.damage = damage

        this.whoShot = whoShot

        this.durability = durability
    }
}

/** @SERVER_GAME_LOOOOOP ********** */
var startedCountdown = false
var amountOfBerries = 0
var countDownTime = 0; //already spawned in?
setInterval(()=>{
    if (!enemies[bossID] && !startedCountdown){
        toggleOpeningsToArena(false);
        startedCountdown = true
        countDownTime = 60; // seconds  
        let countdownInterval = setInterval(() => {
            countDownTime--;
    
            if (countDownTime === 0) {
                clearInterval(countdownInterval); // Stop the countdown interval
                toggleOpeningsToArena(true);
                enemies[bossID] = new Boss();
                enemyCount++;
                startedCountdown = false
                console.log("The boss has entered the arena.");
            }
        }, 1000);
    }
    
    //Spawn in enemies (chance of)
    if(enemyCount < 10){
        if(random(100, 1) == 1){
            if(random(10,1) == 1) spawnLord()
            else spawnNormal()
        }
    }
    //Move and update enemies' health
    for(let e in enemies){
        if(enemies[e].type=="Summoned_Lord"){
            enemies[bossID].health = enemies[bossID].maxHealth * 3/4
        }
        enemies[e].move()
        if(enemies[e].health <= 0) {
            enemyCount -= 1
            let pick = random(enemies[e].lootTable.length-1, 0) 
            //find if percentage beats
            if(random(100, 1) <= enemies[e].lootTable[pick].generationProbability){
                let loot = enemies[e].lootTable[pick]
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
            entities[e].health += 0.01
        }
        if(entity.health <= 0){
            entities[e].isDead = true // This player is NOW dead!!
        }
    }

    //add berries, swords, etc.
    if(random(1000,1)==1 && amountOfBerries < mapSize/entitySize){
        let spawnLocation = findSpawn()
        if(random(5, 1) == 1){
            pickables[pickablesID] = new Pickable(pickablesID, spawnLocation.x, spawnLocation.y, "Speed", "/imgs/SP.png")
            pickablesID ++
            amountOfBerries ++
        } else{
            pickables[pickablesID] = new Pickable(pickablesID, spawnLocation.x, spawnLocation.y, "XP", "/imgs/Berry.png")
            pickablesID ++
            amountOfBerries ++
        }
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

    // Update particles
    for (let key in particles) {
        let particle = particles[key];
        if(particle.duration > 1){
            particles[key].duration -= 1
        } else{
            delete particles[key]
        }

    }

    // Update projectiles
    for (let key in projectiles) {
        let projectile = projectiles[key];
        // Check if projectile is out of the world
        let projectileOut = {x:null,y:null}
        if(projectile.x < BORDERS.L){
            projectileOut.x = BORDERS.L
        } else if(projectile.x > BORDERS.R){
            projectileOut.x = BORDERS.R
        }
        if(projectile.y < BORDERS.D){
            projectileOut.y = BORDERS.D
        } else if(projectile.y > BORDERS.U){
            projectileOut.y = BORDERS.U
        }
        if ((projectileOut.x || projectileOut.y) || projectile.duration <= 0) {
            if(projectile.durability > 0){
                // Create a pickable object at projectile's position
                pickables[pickablesID] = new Pickable(pickablesID, projectileOut.x?projectileOut.x:projectile.x, projectileOut.y?projectileOut.y:projectile.y, projectile.type, null, holdableItems[projectile.type].name, projectile.rotation, projectile.durability);
                pickablesID++;
            }
            delete projectiles[key];
            break;
        } else {
            projectile.duration -= 1; // Update projectile duration
        }

        // Check collision with walls
        let collision = checkCollision(structures, projectile.x, projectile.y, projectile.speed * Math.cos(projectile.direction), projectile.speed * Math.sin(projectile.direction), projectile.whoShot.onWall, projectile, false, projectile.width == projectile.height ? projectile.width : Math.max(projectile.width, projectile.height));
        
        // Check if the projectile goes out of bounds
        if (!(projectile.x + collision.tx > BORDERS.L && projectile.x + collision.tx < BORDERS.R && projectile.y + collision.ty > BORDERS.D && projectile.y + collision.ty < BORDERS.U)) {
            collision = { tx: 0, ty: 0 };
        }
        
        // Drop projectile if it stops
        if (collision.tx === 0 || collision.ty === 0){
            if( projectile.durability > 0){
                // Create a pickable object at projectile's position
                pickables[pickablesID] = new Pickable(pickablesID, projectile.x, projectile.y, projectile.type, null, holdableItems[projectile.type].name, projectile.rotation, projectile.durability);
                pickablesID++;
            }
            delete projectiles[key];
        }

        // Update projectile position
        projectile.x += collision.tx;
        projectile.y += collision.ty;

        // Damage entities and enemies
        let damageables = [entities, enemies];
        damageables.forEach(obj => {
            for (let k in obj) {
                let entity = obj[k];
                // Check if projectile hits entity
                if (projectile.x > entity.x - entitySize / 2 &&
                    projectile.x < entity.x + entity.width - entitySize / 2 &&
                    projectile.y > entity.y - entitySize / 2 &&
                    projectile.y < entity.y + entity.height - entitySize / 2) {
                    // Decrease entity health by projectile damage
                    entity.health -= projectile.damage;
                    if (entity.health <= 0) {
                        // If entity is killed, update player's stats
                        let whoShotIt = projectiles[key].whoShot.username;
                        let messages = [
                            `${whoShotIt} killed ${entity.username} with a ${projectile.type}.`,
                            `${whoShotIt} shot ${entity.username}.`,
                            `The ${projectile.type} from ${whoShotIt} found its mark on ${entity.username}.`,
                            `${entity.username} was sniped from afar by ${whoShotIt} with an ${projectile.type}.`
                        ];
                        let deathMessage = messages[Math.floor(Math.random() * messages.length)];
                        let player = entities[projectiles[key].whoShot.id];
                        console.log(deathMessage);
                        player.xp += entity.xp;
                        player.kills++;
                    }
                    if(projectile.durability != Infinity 
                    && projectile.durability > 0){
                        pickables[pickablesID] = new Pickable(pickablesID, projectile.x, projectile.y, projectile.type, null, holdableItems[projectile.type].name, projectile.rotation, projectile.durability);
                        pickablesID++;
                    }
                    delete projectiles[key];
                    break;
                }
            }
        });
    }

    //update pickables (despawn?)
    for(let key in pickables){
        let pickable = pickables[key]
        pickable.despawnIn -= 1
        if(pickable.despawnIn <= 0){
            delete pickables[key]
        }
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
            lakes: Object.values(lakes),
            markets: Object.values(markets),
            holdables: holdableItems
        })
        console.log("Player ", player.username, player.id, "joined the server.")
    }) 

    //update player (all vital info)
    socket.on("updatePlayer", (d)=>{
        let player = d.player
        id = player.id //update!
        let entity = entities[id];
        if(entity) {
            let { id, x, y, rotation, invSelected, speed, onWall, inventory } = player
            if (entity) {
                Object.assign(entity, { x, y, rotation, invSelected, speed, onWall });
                if (d.reorder) entity.inventory = inventory;
            }
        } else if(player.id && !entity){
            id = player.id
            entities[id] = player
            console.log(entities[id].username, id, "was added to pool")
            // put on top of wall if regenerated
            for (let w in structures) {
                let wall = structures[w];
                if (wall.x - wall.width / 2 < player.x && player.x > wall.x + wall.width / 2 
                && wall.y - wall.height / 2 < player.y && player.y > wall.y + wall.height / 2) {
                    console.log("Put player on wall.");
                    player.onWall = true;
                    break;
                }
            }
            //
            socket.emit("reupdate", {
                bordersObj:BORDERS,
                structuresObj: structures,
                mapSize:mapSize,
                entitySize:entitySize,
                walls: Object.values(structures),
                lakes: Object.values(lakes),
                markets: Object.values(markets),
            }) //re updates updated game data.
        }
    })

    //give data if requested
    socket.on("requestUpdateDataFromServer", (data)=>{
        let player = entities[data.id]
        let updateContent = [borderRect] //always have the border

        let players = Object.values(entities).filter(player => !player.isDead) //filter out the "alive players"

        let updateLi = [
            lakes, markets, structures, //landmarks
            particles, //um...
            players, enemies, //entities
            pickables, projectiles, //items
            trees //um....
        ];
        updateLi.forEach(group => {
            for (let i in group) {
                let item = group[i]
                let distance;
                if (item.isCircle) {
                    distance = Math.sqrt(Math.pow(data.x - item.x, 2) + Math.pow(data.y - item.y, 2)) - item.radius;
                    if (distance <= maxLoad) {
                        updateContent.push(item); 
                    }
                } else {
                    let dx = Math.max(Math.abs(data.x - item.x) - item.width / 2, 0);
                    let dy = Math.max(Math.abs(data.y - item.y) - item.height / 2, 0);
                    if(Math.sqrt(dx * dx + dy * dy) <= maxLoad) {
                        updateContent.push(item); 
                    }
                }
            }
        });
        
        //delete killed players
        if(player && player.isDead){// player.health <= 0
            dropAll(id)
            delete entities[id]
            socket.emit("gameOver")
        }

        //if in range
        socket.emit("sendUpdateDataToClient", {
            updateContent: updateContent,
            player: player,
            serverPlayerCount: Object.keys(entities).length,
            leaderboard: Object.values(entities)
            .sort((a, b) => b.kills - a.kills)
            .slice(0, 5)
            .map(player => ({ username: player.username, kills: player.kills, xp: player.xp, id: player.id })), 
            structures:Object.values(structures)
        })
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
            pickablesID++
            entities[id].inventory[player.invSelected] = {...holdableItems["Hand"]}
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
                    
                    projectiles[createID()] = new Projectile("Arrow", player.x + Math.cos(arrowDirection) * entitySize, player.y + Math.sin(arrowDirection) * entitySize, 50, 50, holdableItems["Arrow"].damage, arrowDirection, player, holdableItems["Arrow"].durability);
            
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
            else if(tool.name === "Spear"){
                let spearDirection = player.rotation + Math.PI;
                
                tool.durability -= 1

                projectiles[createID()] = new Projectile("Spear", player.x + Math.cos(spearDirection) * entitySize, player.y + Math.sin(spearDirection) * entitySize, 50, 50, holdableItems["Spear"].damage, spearDirection, player, tool.durability, 75, 20, "/imgs/Spear.png");
                player.inventory[player.invSelected] = {...holdableItems["Hand"]}
            } 
            //melee attack         
            else {
                let didDamage = false
                let damage = (tool.durability === Infinity || !tool.durability)?holdableItems["Hand"].damage:holdableItems[tool.name].damage
                let hitRange = player.inventory[player.invSelected].hitRange?player.inventory[player.invSelected].hitRange:entitySize
                for(let e in entities){    
                    let entity = entities[e]            
                    if(Math.sqrt(Math.pow(entity.x - player.x, 2) + Math.pow(entity.y - player.y, 2)) < hitRange
                    && entity.id != id
                    && Math.abs(Math.abs(data.x) - Math.abs(entity.x)) < player.hitSize
                    && Math.abs(Math.abs(data.y) - Math.abs(entity.y)) < player.hitSize){
                        entity.health -= damage
                        if(entity.health <= 0){
                            player.xp += Math.floor(entity.xp * 0.8 )// give player xp
                            console.log(entity.username, entity.id, "was slain by", player.username, player.id)
                            player.kills ++
                        }
                        didDamage = true // turn to true
                    }
                }
                for(let e in enemies){    
                    let enemy = enemies[e]
                    if(Math.sqrt(Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2)) < hitRange
                    && Math.abs(Math.abs(enemy.x) - Math.abs(data.x)) < player.hitSize
                    && Math.abs(Math.abs(enemy.y) - Math.abs(data.y)) < player.hitSize){
                        enemy.health -= damage
                        if(enemy.health <= 0){
                            //give player xp for killed
                            player.xp += enemy.xp
                            player.kills ++
                        }
                        didDamage = true // turn to true
                    }
                }
                if(didDamage && tool.durability != null){
                    tool.durability -= 1 //DAMAGE Tool
                }
            }

            //BREAK TOOL? Is the tool too weak?
            if(player.inventory[player.invSelected].durability <= 0 
            && player.inventory[player.invSelected].durability!=null){
                //console.log(player.inventory[player.invSelected])
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

    //boss respawn?
    socket.on("GetCountdownInfo", function(){
        let player = entities[id]
        if(player){
            let ret = countDownTime //emit value

            //additional area (padding)
            let aPad = 1.5 //area x __ == actual area detection
            if(!(player.x > structureCenter.x - (structureW/2) * (wallSize * aPad)
            && player.x < structureCenter.x + (structureW/2) * (wallSize * aPad)
            && player.y > structureCenter.y - (structureH/2) * (wallSize * aPad)
            && player.y < structureCenter.y + (structureH/2) * (wallSize * aPad) 
            && countDownTime > 0)) ret = null //emit only when in range...
            
            socket.emit("SendCountdownInfo", {
                time:ret
            })
        }
    })

    //add particles?
    socket.on("addParticles", function(data){
        if(!particleTimeouts[data.id]){
            //creates new particle...
            let id = createID()
            particles[id] = new Particle(data.x, data.y)
            //particle timeout manages time til disappear
            particleTimeouts[data.id] = setTimeout(()=>{
                delete particleTimeouts[data.id]
            }, particleFrequency)
        }
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
    socket.on("playerClosedTab", function(data){
        if(data.player.id && entities[data.player.id]) dropAll(data.player.id)
    })
})