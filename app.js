const { spawn } = require("child_process")
const { log } = require("console")
const { create } = require("domain")
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
console.log("Online @ " + PORT)

/************ CONSTS/VARS *********************/
//RANDOM
var random = (max, min) => Math.floor(Math.random() * (max - min + 1)) + min

function createRandomString(l=10){
    var pool = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#?! '
    var ret_string = ""
    for(var i = 0; i < l; i ++){
        ret_string += pool[random(0, pool.length)]
    }
    return ret_string
}
//CREATE NEW IDs
function createID(){
    /*GENERATE ID*/
    id = createRandomString() //rand id
    while (id in ids){id = createRandomString()}
    ids.push(id) //keep track of all ids
    return id
}

var maxLoad = 750 //most px a player can see 
//const speedFactor = PORT===1111? 1 : 2 //adjust how fast the game goes (the lower the slower) 
//Render is slowerm so runs at x[speedFactor] as fast
//ENTITIES speed not affected
const maxImmuneDuration = 10000 //* speedFactor//
const swordRotation = 45/57.1
const holdableItems = {
    "Hand":{
        name:"Hand", // MUST MATCH KEY!
        class:"Hand",
        imgSrc:null,
        durability:Infinity,
        maxDurability:Infinity,
        damage:5,
        generationProbability:0, //out of 100
        rotation:0,
        stackSize:0,
        maxStackSize:0,
        cost: Infinity, //market value
        hitRange: null,
        cooldownTime: 5 , //* 1/speedFactor, //ms till next use
        cooldownTimer: 0
    },
    "Iron Sword":{
        name:"Iron Sword", // MUST MATCH KEY!
        class:"Sword",
        imgSrc:"/imgs/Sword.png",
        durability:30,
        maxDurability:30,
        damage:25,
        generationProbability:50, //out of 100
        rotation:swordRotation,
        stackSize:1,
        maxStackSize:1,
        cost: 2000, //market value
        hitRange: 175,
        cooldownTime: 5 , //* 1/speedFactor, //mms till next use
        cooldownTimer: 0
    },
    "Gold Sword":{
        name:"Gold Sword", // MUST MATCH KEY!
        class:"Sword",
        imgSrc:"/imgs/Sword2.png",
        durability:20,
        maxDurability:20,
        damage:30,
        generationProbability:30, //out of 100
        rotation:swordRotation,
        stackSize:1,
        maxStackSize:1,
        cost: 3500, //market value
        hitRange: 150,
        cooldownTime: 15 , //* 1/speedFactor, //ms till next use
        cooldownTimer:0
    },
    "Diamond Sword":{
        name:"Diamond Sword", // MUST MATCH KEY!
        class:"Sword",
        imgSrc:"/imgs/Sword3.png",
        durability:60,
        maxDurability:60,
        damage:40,
        generationProbability:10, //out of 100
        rotation:swordRotation,
        stackSize:1,
        maxStackSize:1,
        cost: 5000, //market value
        hitRange: 150,
        cooldownTime: 10 , //* 1/speedFactor, //ms till next use
        cooldownTimer:0
    },
    "Plasma Sword":{
        name:"Plasma Sword", // MUST MATCH KEY!
        class:"Sword",
        imgSrc:"/imgs/Sword4.png",
        durability:100,
        maxDurability:100,
        damage:50,
        generationProbability:1, //out of 100
        rotation:swordRotation,
        stackSize:1,
        maxStackSize:1,
        cost: 10_000, //market value
        hitRange: 125,
        cooldownTime: 50 , //* 1/speedFactor, //ms till next use
        cooldownTimer:0
    },
    "Vantacite Sword":{
        name:"Vantacite Sword", // MUST MATCH KEY!
        class:"Sword",
        imgSrc:"/imgs/Sword5.png",
        durability:200,
        maxDurability:200,
        damage:80,
        generationProbability:0.1, // 1 in 1000
        rotation:swordRotation, //rad
        stackSize:1,
        maxStackSize:1,
        cost: 30_000, //market value
        hitRange: 85,
        cooldownTime: 200 , //* 1/speedFactor, //ms till next use
        cooldownTimer:0
    },
    "Arrow":{
        name:"Arrow", // MUST MATCH KEY!
        class:"Arrow",
        imgSrc:"/imgs/Arrow.png",
        durability:Infinity,
        maxDurability:Infinity,
        damage: 1,
        generationProbability:75, //out of 100
        rotation:0,
        stackSize:1, //start out stack Size
        maxStackSize:64,
        cost: 25, //market value
        hitRange: null,
        cooldownTime: 0 , //* 1/speedFactor, //ms till next use
        cooldownTimer:0
    },
    "Bow":{
        name:"Bow",  // MUST MATCH KEY!
        class:"Bow",
        imgSrc:"/imgs/Bow.png",
        //loadedBowPic:"/imgs/Bow_And_Arrow.png",
        durability:100,
        maxDurability:100,
        damage: "Max 21", //check createArrow's damage
        generationProbability:10, //out of 100
        rotation:0,
        stackSize:1,
        maxStackSize:1,
        cost: 1000, //market value
        hitRange: maxLoad,
        cooldownTime: 0, //20 bc now hold down for power/damage
        cooldownTimer:0
    },
    "Spear":{
        name:"Spear", // MUST MATCH KEY!
        class:"Spear",
        imgSrc:"/imgs/Spear.png",
        durability:15,
        maxDurability:15,
        damage:80,
        generationProbability:1, //out of 100
        rotation:0, //how looks like when held
        stackSize:1,
        maxStackSize:1,
        cost: 2500, //market value
        hitRange: maxLoad,
        cooldownTime: 0 , //* 1/speedFactor, //ms till next use
        cooldownTimer:0
    },
    "Force Shield":{
        name:"Force Shield", // MUST MATCH KEY!
        class:"UseUpErs", //Use-Up-Ers are used upon click
        imgSrc:"/imgs/Shield.png",
        durability:null,
        maxDurability:null,
        damage:0,
        generationProbability:15, //out of 100
        rotation:0, //how looks like when held
        stackSize:1,
        maxStackSize:2,
        cost: 2000, //market value
        hitRange: maxLoad,
        cooldownTime: 0 , //* 1/speedFactor, //ms till next use
        cooldownTimer:0,
        immuneDuration: maxImmuneDuration//s
    },

    "Debug":{
        name:"Debug", // MUST MATCH KEY!
        class:"Sword",
        imgSrc:"/imgs/Sword5.png",
        durability:100000,
        maxDurability:100000,
        damage:1000,
        generationProbability:0, // 1 in 1000
        rotation:swordRotation, //rad
        stackSize:1,
        maxStackSize:1,
        cost: 1_000_000_000, //market value
        hitRange: 1000,
        cooldownTime: 1 , //* 1/speedFactor, //ms till next use
        cooldownTimer:0
    },
}

var ids = [] //player ids list
/************ MAP SIZE *********************/
const mapSize = 4000 //px

/************ UNIVERSAL *********************/
const entitySize = 75

/************ WORLDS *********************/
class World {
    constructor(id, mp=4000){
        this.id = id
        this.mapSize = mp

        this.enemies = {} //bots
        this.entities = {} //players
        this.trees = {}
        this.lakes = {}

        this.structures = {}
        this.escapesData = []

        this.projectiles = {}
        this.pickables = {}
        this.particles = {}
        this.particleTimeouts = {}
        this.markets = {}

        this.BORDERS = {
            "L" : -this.mapSize/2,
            "U" : this.mapSize/2,
            "R" : this.mapSize/2, 
            "D" : -this.mapSize/2  
        }
        this.borderRect = {
            id:"BorderRect",
            x:-this.mapSize/4,
            y:-this.mapSize/4,
            width:this.mapSize,
            height:this.mapSize,
            isRect:true,
            color:"rgb(34, 60, 33)"
        }

        this.obstacles = {}
    }
}
var worlds = {}
worlds["Main"] = new World("Main") //Create main world


worlds["1"] = new World("1") //Create main world
worlds["1"].obstacles = Object.assign({}, worlds["1"].structures, worlds["1"].trees)

/** @STRUCTURES *****/
class Wall {
    constructor(wall, id, wallSize, worldID="Main") {
        this.x = wall.relX;
        this.y = wall.relY;
        this.class = "Wall"
        this.id = `WALL${id}`;
        this.imgSrc = random(5,1)==5?"/imgs/Mossy%20Wall.png":"/imgs/Wall.png";
        this.width = wallSize 
        this.height = wallSize 
        this.rotation = 0

        this.worldID = worldID
    }
}
class Stairs {
    constructor(x, y, id, wallSize, rotation, worldID="Main") {
        this.x = x;
        this.y = y;
        this.class = "Stairs"
        this.id = `STAIRS${id}`;
        this.imgSrc = "/imgs/Stairs.png";
        this.width = wallSize;
        this.height = wallSize;
        this.rotation = rotation

        this.worldID = worldID
    }
}

var structuresID = 0
var mainStructureCenter = {x:0,y:0}

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
var wallSize = 100

var escapesIDRoot = "Escapes"
var escapesIDs = []
function toggleOpeningsToArena(escapesLocked, worldID="Main"){
    if(!escapesLocked){
        let i = 0
        for(let e in worlds["Main"].escapesData){
            let obj = worlds["Main"].escapesData[e]
            let id = `${escapesIDRoot}${i}`
            worlds["Main"].structures[id] = new Stairs(obj.x, obj.y, id, wallSize, obj.r==1?270*(Math.PI/180):90*(Math.PI/180))
            escapesIDs.push(id)
            i++
        }
    } else{
        for(let i in escapesIDs){
            let id = escapesIDs[i]
            delete worlds[worldID].structures[id]
        }
        escapesIDs = []
    }
}
/** @MAIN_STRUCTURE */
/**Key:
 * S = Stairs
 * W = Wall
 * N = Space
 * E = Escape (Comes later after boss defeated)
 */
for(let r = 0; r < structureW; r++){
    for(let c = 0; c < structureH; c++){
        let wall = {
            relX: r*wallSize-(structureW * wallSize)/2 + mainStructureCenter.x,
            relY: c*wallSize-(structureH * wallSize)/2 + mainStructureCenter.y
        }
        if(structureBlueprint[r][c] == "W"){
            worlds["Main"].structures[`STRUCTURE${structuresID}`] = new Wall(wall, structuresID, wallSize)
            structuresID++;
        } else if(structureBlueprint[r][c] == "S"){
            worlds["Main"].structures[structuresID] = new Stairs(wall.relX, wall.relY, structuresID, wallSize, c==0?Math.PI:(Math.PI/180)) //make rotate based on corner
            structuresID++;
        } else if(structureBlueprint[r][c] == "E"){
            worlds["Main"].escapesData.push({x:wall.relX,y:wall.relY,r:r,c:c})
        }
    }
}


/** @LAKES */
/** Take a swim! Cool off bud!*/
class Lake{
    constructor(x, y, radius, worldID="Main"){
        this.x = x
        this.y = y
        this.size = radius
        this.radius = radius
        this.isCircle = true
        this.color = "#188B8F"

        this.decreaseSpeedFactor = 0.5 //* speedFactor //slow speed

        this.worldID = worldID
    }
}

//generate
let lakeCount = Math.floor(mapSize/1000)>0?Math.floor(mapSize/1000):1
//lakes
console.log("Lakes:", lakeCount)
for(let i = 0; i < lakeCount; i++){
    let size = random(300,250)
    worlds["Main"].lakes[`LAKE${i}`] = new Lake(random(mapSize/2-size,-mapSize/2+size), random(mapSize/2-size,-mapSize/2+size), size)
}

/************************** @SMALL_STRUCTURE_GENERATOR *************/
var numOfRandomWalls = random(Math.ceil(mapSize/400), Math.floor(mapSize/1600))
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
    let structureSize = blueprintSize * wallSize
    let a = findSpawn(structureSize, "Main") //Spawn only in the main world
    let allStairs = []
    //generate Structure
    for(let r = 0; r < blueprintSize; r++){
        for(let c = 0; c < blueprintSize; c++){
            let nC = { 
                relX: a.x+c*wallSize, 
                relY: a.y+r*wallSize 
            }
            if(blueprint[r][c] == "W"){
                worlds["Main"].structures[`STRUCTURE${structuresID}`] = new Wall(nC, structuresID, wallSize)
                structuresID++
            } else if(blueprint[r][c] == "S"){
                allStairs.push({r:r,c:c,id:structuresID})
                worlds["Main"].structures[structuresID] = new Stairs(nC.relX, nC.relY, structuresID, wallSize, 0) //rotate none as a placeholder
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
            let old = worlds["Main"].structures[stair.id]
            worlds["Main"].structures[`STRUCUTRE${stair.id}`] = new Wall({relX:old.x,relY:old.y}, structuresID, wallSize)
            console.log("Stairs replaced.")
        }

        worlds["Main"].structures[stair.id].rotation = rotate * (Math.PI/180) //convert deg to rad
    }
}

/**************************** @PARTICLES *************/
/**
 * Particles are for animation, when an object steps
 * in water, climbs walls?, etc. For animation purposes.
 */
var particleFrequency = 400 // 
class Particle{
    constructor(x, y, radius=random(entitySize/2, entitySize/5), worldID="Main"){
        this.x = x
        this.y = y
        this.duration = 95
        this.color = "#00000008"
        this.size = radius
        this.radius = radius

        this.isCircle = true

        this.worldID = worldID
    }
}

/**************************** @MARKETS *************/
var marketID = 0
var marketSize = 200
class Market{
    constructor(x, y, ID, imgSize=marketSize, worldID="Main") {
        this.x = x;
        this.y = y;
        this.id = ID;
        this.imgSrc = "/imgs/Market.png";
        this.width = imgSize;
        this.height = imgSize;

        this.worldID = worldID
    }
}
//markets
for(let i = 0; i < 3; i ++){
    let coords = findSpawn(marketSize, "Main")
    let newMarket = new Market(coords.x, coords.y, marketID)
    worlds["Main"].markets[marketID] = newMarket
    marketID++
}

/**************************** @TREES *************/
class Tree {
    constructor(treesID, size=random(500,200), worldID="Main") {
        this.worldID = worldID

        let thing = this.treeFindSpawn(size)
        this.class = "Tree"
        this.x = thing.x;
        this.y = thing.y;
        this.id = `TREE${treesID}`;
        //this.color = "rgb(0, 95, 0, 0.3)";
        this.width = size
        this.height = size
        this.treeType = random(1,3)
        this.imgSrc = `/imgs/Tree${this.treeType}.png`
        this.opaqueImgSrc = `/imgs/Opaque_Tree${this.treeType}.png`
        this.rotation = random(0, 355) * (Math.PI/180)
        this.obstructionRadius = 20
    }
    treeFindSpawn (s) {
        let x, y;
        let doNotPass = true;
        while (doNotPass) {
            doNotPass = false; // be optimistic, you know?
            x = random((mapSize / 2) - (s / 2), -(mapSize / 2) + (s / 2));
            y = random((mapSize / 2) - (s / 2), -(mapSize / 2) + (s / 2))
            //cannot spawn on structures or markets 
            var world = worlds[this.worldID]
            let li1 = [world.structures, world.markets]
            li1.forEach(obj=>{
                for (let sKey in obj) {
                    let st = obj[sKey];
                    let p = 20; // padding
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
            for(let l in world.lakes){
                let lake = world.lakes[l]
                let distance = Math.sqrt(Math.pow(x - lake.x, 2) + Math.pow(y - lake.y, 2));
                if(distance <= lake.radius){
                    doNotPass = true; // aww
                    break
                }
            }
        }
        return { x, y };
    }
}
var treesID = 0
var treeCount = mapSize/50 // tree count
//Generate trees in the world...
for(let i = 0; i < treeCount; i ++){
    let newTree = new Tree(treesID)
    worlds["Main"].trees[`Tree${treesID}`] = newTree
    treesID++
}

/************************** @SPAWN_FINDER *************/
/**
 * Everyone needs a home!
 */
function findSpawn(size=0, worldID="Main") {
    let s = size;
    let x, y;
    let doNotPass = true;
    while (doNotPass) {
        doNotPass = false; // be optimistic, you know?
        x = random((mapSize / 2) - (s / 2), -(mapSize / 2) + (s / 2));
        y = random((mapSize / 2) - (s / 2), -(mapSize / 2) + (s / 2));
        //cannot spawn on structures or markets 
        let thisWorld = worlds[worldID]
        let li1 = [thisWorld.structures, thisWorld.markets]
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
        for(let t in thisWorld.trees){
            let tree = thisWorld.trees[t]
            if(Math.sqrt(Math.pow(x-tree.x,2) + Math.pow(y-tree.y,2)) < tree.obstructionRadius + entitySize){
                doNotPass = true; // aww
                break
            }
        }
        for(let l in thisWorld.lakes){
            let lake = thisWorld.lakes[l]
            let distance = Math.sqrt(Math.pow(x - lake.x, 2) + Math.pow(y - lake.y, 2));
            if(distance <= lake.radius){
                doNotPass = true; // aww
                break
            }
        }
    }
    return { x, y };
}
//Function same in PLAYER js file~! 
//HIT WALLS?
function checkCollision(obstacles, playerX, playerY, tx, ty, onWall, who, particlesTF=true, size=entitySize, worldID="Main") {
    if(onWall) return { tx, ty }
    let world = worlds[worldID]
    let newX = playerX + tx;
    let newY = playerY + ty;
    var obstructionPadding = size/2 
    for(let w in obstacles){
        let obstacle = obstacles[w]
        if(obstacle.class == "Wall" && !onWall){
            let width = obstacle.width + obstructionPadding
            let height = obstacle.height + obstructionPadding 
            let obstacleX = obstacle.x - width/2
            let obstacleY = obstacle.y - height/2
            if (newX >= obstacleX &&
                newX <= obstacleX + width &&
                obstacleY <= playerY && playerY <= obstacleY + height) {
                tx = 0;
            }
            if (newY >= obstacleY &&
                newY <= obstacleY + height &&
                obstacleX <= playerX && playerX <= obstacleX + width) {
                ty = 0;
            }
        } else if(obstacle.class == "Tree"){
            var treeCenterX = obstacle.x
            var treeCenterY = obstacle.y
            if(Math.sqrt(Math.pow(newX-treeCenterX,2) + Math.pow(playerY-treeCenterY,2)) < obstacle.obstructionRadius + (obstructionPadding/2)){
                tx = 0
            }
            if(Math.sqrt(Math.pow(newY-treeCenterY,2) + Math.pow(playerX-treeCenterX,2)) < obstacle.obstructionRadius + (obstructionPadding/2)){
                ty = 0
            }
        }
    }
    if (!onWall && particlesTF) {
        for (let l in world.lakes) {
            let lake = world.lakes[l];
            let distanceSquared = Math.pow(lake.x - playerX, 2) + Math.pow(lake.y - playerY, 2);
            if (distanceSquared <= Math.pow(lake.radius, 2)) {
                if(who&&!world.particleTimeouts[who.id]){
                    world.particleTimeouts[who.id] = setTimeout(()=>{
                        delete world.particleTimeouts[who.id]
                    }, particleFrequency)
                    world.particles[createID()] = new Particle(playerX, playerY)
                }
                return { tx: tx * lake.decreaseSpeedFactor, ty: ty * lake.decreaseSpeedFactor };
            }
        }
    }    
    
    return { tx, ty };
}

/**************************** @PICKABLES *************/
//need to update Pickable class
const pickableSize = 10
class Pickable{//*&*&*&
   constructor(id, x, y, obj, rotation=0, durability=1, stackSize=1, worldID="Main"){
       this.id = id
       this.x = x
       this.y = y
       this.name = obj.name //WARNING: THIS HAS TO EQUAL THE HOLDABLE ITEMS "KIND"/"NAME" IF A STACKABLE!! 
       this.class = obj.class
       this.type = "pickable"
       this.imgSrc = obj.imgSrc?obj.imgSrc:null
       this.width = this.height = 50
       this.itemName = obj.name
       this.rotation = rotation
       this.durability = durability
       this.stackSize = stackSize
       this.despawnIn = 10000 // * fps sec

       this.worldID = worldID
   }
}
const coins = {
    "Health":{
        name:"Health", 
        class:"Coin",
        imgSrc:"/imgs/Health_Coin.png",
        xpAmount:25,
    },
    "Speed":{
        name:"Speed",  
        class:"Coin",
        imgSrc: "/imgs/Speed_Coin.png",
        xpAmount:25,
    },
    "Coin":{
        name:"Coin", 
        class:"Coin",
        imgSrc:"/imgs/Coin.png",
        xpAmount:100,
    }
}
//drop everything after death
/**
 * This function copies the inventory of an entity
 * in entities via the "id" parameter.
 */
function dropAll(id, type="player", worldID="Main"){
    let world = worlds[worldID]
    if (type == "player") from = world.entities[id]
    else if (type == "enemy") from = world.enemies[id]
    if(from){
        from.inventory.forEach(slot=>{
            if(slot.name != "Hand"){
                let scatterRange = entitySize * 2 // area of scattering items
                let x = random(from.x + scatterRange, from.x - scatterRange)
                let y = random(from.y + scatterRange, from.y - scatterRange)
                if (x >= world.BORDERS.R){
                    x = world.BORDERS.R
                } else if(x <= world.BORDERS.L){
                    x = world.BORDERS.L
                }
                if (y >= world.BORDERS.U){
                    y = world.BORDERS.U
                } else if (y <= world.BORDERS.D){
                    y = world.BORDERS.D
                }
                var id = createID()
                world.pickables[id] = new Pickable(id,x,y,slot,0,slot.durability,slot.stackSize)
            }
        })
    }
}

/**************************** @ENTITIES *************/
class Entity {
    constructor(type, imgSrc, speed, w, h, x, y, health, xp=0, id=createID(), worldID="Main") {
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = type;
        this.rotation = 0;               //changing this 
                                         // changes nothing, 
                                         //as rotation will be 
                                         //set later...
        this.defaultRotation = -Math.PI/2//...change this instead
        this.health = health; //current health
        this.maxHealth = health; //max health
        this.showH = true
        this.imgSrc = imgSrc;
        this.isCircle = false;
        this.width = w;
        this.height = h;
        this.size = (w==h)?w:Math.max(w, h)
        this.speed = PORT==1111?(speed / 5):speed / 5
        this.maxSpeed = PORT==1111?(speed / 5):speed / 5 //same as this.speed
        this.onWall = false //default
        this.immuneDuration = 0 //this > 0 == can't take damage (see MAX Immune Duration)
        this.xp = xp

        this.worldID = worldID
    }
}
class Player extends Entity{
    constructor(x, y, username, imgSrc="/imgs/Player.png", worldID, type="player", speed=10, w=entitySize, h=entitySize, health = 100){
        super(type, imgSrc, speed * 2, w, h, x, y, health, 5000, "PLAYER"+createID(), worldID)
        this.username = (username == "")? createRandomString(5):username;
        this.kills = 0
        this.inventory = [
            {...holdableItems["Hand"]},//Debug"]},
            {...holdableItems["Hand"]},
            {...holdableItems["Hand"]},
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
        this.deathMessage = null
    }
}
class Enemy extends Entity{
    constructor(key, x, y, id, worldID="Main", inventory=[], invSelected=0,){
        var enemy = enemyObj[key]
        super(enemy.type, enemy.imgSrc, enemy.speed, enemy.w, enemy.h, x, y, enemy.health, 0, id, worldID)
        this.username = "BOT_Enemy"
        this.detectRange = enemy.detectRange
        this.damage = enemy.damage
        this.target
        this.dx = 0;
        this.dy = 0;   
        this.moving = false   
        this.justAttacked = false
        this.cooldownTime = 0 //s
        this.cooldownDuration = enemy.reloadTime //ms
        this.cooldownSF = 1 //speed/decrease length of reloadTime in slower/faster servers
        /** @this.lootable - what it drops*/
        this.lootTable = enemy.lootTable
        this.xp = enemy.giveXP
        
        this.inventorySize = 1
        this.inventory = inventory.length===0 ? Array.from(
            { length: this.inventorySize }, 
            () => (
                {...holdableItems["Hand"]}
            )) : inventory
        this.invSelected = invSelected

        this.targetX = 0
        this.targetY = 0
        this.targetType
    }
    findTarget(){
        let minDist = this.detectRange//10**10;
        let targetData;
        let world = worlds[this.worldID]
        for (let i in world.entities) {
            let plyr = world.entities[i]
            let dist = Math.sqrt(Math.pow(plyr.x - this.x, 2) + Math.pow(plyr.y - this.y, 2));
            if (dist < minDist && plyr.type == "player" && plyr) {
                minDist = dist;
                targetData = {
                    key:i,
                    targetType:"player"
                } //player target
            }
        }
        // if no player is found, then pick things up
        if(!targetData && this.inventory.some(item => item.name === "Hand")){
            for (let i in world.pickables) {
                let item = world.pickables[i]
                let dist = Math.sqrt(Math.pow(item.x - this.x, 2) + Math.pow(item.y - this.y, 2));
                if (dist < minDist && item && item.class!="Coin") {
                    minDist = dist;
                    targetData = {
                        key:i,
                        targetType:"pickable"
                    }; //item target
                }
            }
        }
        if(targetData!=undefined) {
            if(targetData.targetType == "player"){
                this.target = world.entities[targetData.key]
            } else if(targetData.targetType == "pickable"){
                this.target = world.pickables[targetData.key]
            }
            this.targetType = targetData.targetType
        }
        else{this.target = null}
    }
    damageCoolDown(){
        if(this.justAttacked){
            this.cooldownTime ++
            //adds up until over
            if(this.cooldownTime * this.cooldownSF >= this.cooldownDuration) {
                this.cooldownTime = 0
                this.justAttacked = false
            }
        }
    }
    //AI, decisions made here
    move() {
        //console.log(this.worldID)
        let world = worlds[this.worldID] //this world

        this.findTarget()
        this.damageCoolDown()
        // Calculate the distance between the enemy and the user
        //dx, dy = target x, y
        this.dx = this.dy = this.dist = 0
        var distanceToTarget
        if(this.target) {
            distanceToTarget = Math.sqrt((this.target.x - this.x) ** 2 + (this.target.y - this.y) ** 2)
        }
        else {distanceToTarget = 10**10}

        if(distanceToTarget <= this.detectRange) { // Is player within range?
            this.status = "Attack"
            this.dx = this.target.x - this.x;
            this.dy = this.target.y - this.y;
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
        this.moveMove()
        // Check for damage
        if(distanceToTarget < this.width/2 && !this.justAttacked){
            if(this.targetType == "player"){    
                let player = world.entities[this.target.id]
                var damage = this.damage
                var tool = this.inventory[this.invSelected]
                if(tool.class == "Sword"){
                    damage += tool.damage
                    this.inventory[this.invSelected].durability -= 1
                    if(this.inventory[this.invSelected].durability <= 0){
                        this.inventory[this.invSelected] = {...holdableItems["Hand"]}
                    }
                }
                dealDamageTo(damage, this, player)
                this.justAttacked = true
            } else if(this.targetType == "pickable"){
                let item = world.pickables[this.target.id]
                for(let i in this.inventory){
                    let slotName = this.inventory[i].name
                    //acquire item pick up item
                    if(slotName == "Hand"){
                        let nItem = { ...holdableItems[item.itemName], stackSize:item.stackSize, durability:item.durability}
                        this.inventory[i] = nItem
                        delete world.pickables[item.id]
                        break
                    }
                }
            }
        }
    }
    //the actual moving is done here
    moveMove(){
        var world = worlds[this.worldID]

        this.dist = Math.sqrt(this.dx ** 2 + this.dy ** 2);
        // Normalize the distance
        if(this.dist > 0){
            this.dx /= this.dist;
            this.dy /= this.dist;
        }
        this.xInc = this.dx * this.speed
        this.yInc = this.dy * this.speed
        //Can't go out of frame
        if (this.x + this.xInc > world.BORDERS.R || this.x + this.xInc < world.BORDERS.L){this.xInc = 0}
        if (this.y + this.yInc > world.BORDERS.U || this.y + this.yInc < world.BORDERS.D){this.yInc = 0}
        
        //update onWall
        let oW = false
        for(let w in world.structures){
            let wall = world.structures[w]
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
            checkCollision(world.obstacles, this.x, this.y, this.xInc, this.yInc, this.onWall, this, true, this.width==this.height?this.width:Math.max(this.width, this.height), this.worldID)
        this.xInc = newCoords.tx
        this.yInc = newCoords.ty

        // UPDATE
        this.x += this.xInc
        this.y += this.yInc
        this.rotation = Math.atan2(this.dy, this.dx) + this.defaultRotation
    }
}
class Boss extends Enemy{
    constructor(x=0, y=0){
        super("Boss", x, y, bossID)
        this.summonGuards = false
        this.summoned = 0
    }
    move(){
        if(this.health < this.maxHealth * 3/4){
            if(!this.summonGuards) this.summonInGuards()
        } 
        super.move()

        let world = worlds[this.worldID]
        if(this.health == this.maxHealth){
            for(let e in world.enemies){
                if (world.enemies[e].type=="Summoned Lord"){
                    delete world.enemies[e]
                    this.summonGuards = false
                    this.summoned = 0
                }
            }
        } else if (this.health < this.maxHealth){
            //regenerate!! >:)
            this.health += 0.01 //* speedFactor
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
                    worlds[this.worldID].enemies[id] = new Enemy("Summoned Lord", x, y, id)
                    this.summoned++
                }
            }
        }
    }
}
class Archer extends Enemy{
    constructor(x, y, id, worldID){
        var data = enemyObj["Archer"]
        super("Archer", x, y, id, worldID, data.inventory, data.invSelected)
        this.shootRange = data.shootRange // to walk closer before shooting...
        this.holdDuration = 0
        this.holdNum = 0
    }
    move(){
        //move normally if not holding bow
        if(this.inventory[this.invSelected].name == "Bow"){
            super.findTarget()
            super.damageCoolDown()
            
            this.dx = this.dy = this.dist = 0
            var distanceToTarget
            
            if(this.target) {
                distanceToTarget = Math.sqrt((this.target.x - this.x) ** 2 + (this.target.y - this.y) ** 2)
            }
            else {distanceToTarget = 10**10}

            // Is player within detection range?
            if(distanceToTarget <= this.detectRange) { 
                //Attack mode...ON!
                this.status = "Attack"
                this.dx = this.target.x - this.x;
                this.dy = this.target.y - this.y;
                this.rotation = Math.atan2(this.dy, this.dx) + this.defaultRotation
                this.moving = true; //aka, dont stray from the player now...
                //is the player still too far away to shoot?
                if(distanceToTarget > this.shootRange){
                    //YES!...then get closer to shoot
                    this.speed = this.maxSpeed 
                    super.moveMove() 
                } else {
                    //NO!...attack!!
                    //Did you just attack?
                    if(!this.justAttacked){
                        //Apparently NO!...
                        this.speed = 0 //stop movement
                        
                        //load up...
                        //holdNum/30 = duration of loading
                        this.holdNum += 1
                        this.holdDuration = Math.floor(this.holdNum/(100*this.cooldownSF)) > 5?5:Math.floor(this.holdNum/30)+1
                        //change imgSrc
                        this.inventory[this.invSelected].imgSrc = `/imgs/Bow${this.holdDuration}.png`
                        //fire!
                        if(this.holdDuration == 5) {
                            this.shootArrow(this.holdDuration) //FIRE!!
                            this.holdNum = 0 //reset
                        }
                    }
                }
            } else{ 
                this.speed = this.maxSpeed
                if (!this.moving) {
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
                super.moveMove()
            }
        } else{
            this.speed = this.maxSpeed
            super.move()
        }
    }
    shootArrow(holdDuration){
        this.justAttacked = true //you just attacked... -_-
        let arrowOffsetMaxDeg = 10//deg // how many IN DEGREES +- can be offset shot
        let arrowDirection = this.rotation + this.defaultRotation + Math.PI + (random(1, -1) * (random(arrowOffsetMaxDeg, 0) * (Math.PI/180))) //possible +- 45 deg offset shot
        //SHOOT ARROW!
        //make da arrow
        createArrow(this, arrowDirection, holdDuration, this.worldID)
        this.inventory[this.invSelected].imgSrc = "/imgs/Bow.png"

        this.inventory[this.invSelected].durability -= 1
        //bow breaks !? O_O
        if(this.inventory[this.invSelected].durability <= 0){
            this.inventory[this.invSelected] = {...holdableItems["Hand"]}
        }
    }
}

/*************************** @ENEMY_GENERATOR *************/
const maxEnemyCount = Math.floor(Math.sqrt(mapSize**2/400**2)) //1 per 400 sq px
const enemyObj = {
    "Normal":{
        type:"Normal",
        imgSrc:"/imgs/Enemy.png",
        damage: 5,
        detectRange: 400,
        reloadTime: 50,
        speed: 5,
        health: 100,
        w:entitySize,
        h:entitySize,
        lootTable : [
            {...holdableItems["Iron Sword"]}, 
            {...holdableItems["Gold Sword"]}, 
            {...holdableItems["Arrow"], stackSize:random(holdableItems["Arrow"].maxStackSize, 1)},
            {...holdableItems["Bow"]}
        ], 
        giveXP : 100,
        generationProbability:60, //out of 100
        deathMessages:["You died from a monster.", "A monster hit you.", "You were slain by a monster"],
    },
    "Lord":{
        type:"Lord",
        imgSrc:"/imgs/Enemy_Lord.png",
        damage: 40,
        detectRange: 750,
        reloadTime: 100,
        speed: 2.5,
        health: 500,
        w:entitySize * 4/3,
        h:entitySize * 4/3,
        lootTable : [
            {...holdableItems["Iron Sword"]}, 
            {...holdableItems["Gold Sword"]}, 
            {...holdableItems["Arrow"], stackSize:random(holdableItems["Arrow"].maxStackSize, 1)},
            {...holdableItems["Bow"]}
        ],  
        giveXP : 500,
        generationProbability:30, //out of 100
        deathMessages:["You died from a monster leader.", "A monster lord killed you."],
    },
    "Archer":{
        type:"Archer", 
        imgSrc:"/imgs/Enemy_Archer.png", 
        damage:10, 
        detectRange:750, 
        reloadTime:100, 
        speed:3.5, 
        health:100, 
        w:entitySize, 
        h:entitySize,
        inventory:[{...holdableItems["Bow"]}], 
        invSelected:0,
        shootRange:350,
        lootTable : [
            {...holdableItems["Iron Sword"]}, 
            {...holdableItems["Gold Sword"]}, 
            {...holdableItems["Arrow"], stackSize:random(holdableItems["Arrow"].maxStackSize, 1)},
            {...holdableItems["Bow"]}
        ], 
        giveXP : 150,
        generationProbability:25, //out of 100
        deathMessages:["An archer shot you.", "A monster shot you with an arrow.", "You were killed by an archer's arrow."]
    },
    "Summoned Lord":{
        type:"Summoned Lord", 
        imgSrc:"/imgs/Enemy_Summoned_Lord.png", 
        damage:10, 
        detectRange:750, 
        reloadTime:20, 
        speed:4, 
        health:500, 
        w:entitySize, 
        h:entitySize,
        lootTable : [
            {...holdableItems["Iron Sword"]}, 
            {...holdableItems["Gold Sword"]}, 
            {...holdableItems["Arrow"], stackSize:random(holdableItems["Arrow"].maxStackSize, 1)},
            {...holdableItems["Bow"]},
            {...holdableItems["Diamond Sword"]}
        ], 
        giveXP : 500,
        generationProbability:0, //spawns in special occasions
        deathMessages:["You died trying to kill the boss.", "A monster lord killed you.", "You died by a monster summoned by the boss."],
    },
    "Boss":{
        type:"Boss", 
        imgSrc:"/imgs/Enemy_Elder.png", 
        damage:100, 
        detectRange:500, 
        reloadTime:100, 
        speed:4, 
        health : 2000, 
        w:entitySize, 
        h:entitySize,
        lootTable : [{...holdableItems["Plasma Sword"], generationProbability:100}], 
        giveXP : 2500,
        generationProbability:0, //spawns in special occasions
        deathMessages:["You died from the most powerful mob in the game.", "You were punished by the boss", "The boss killed you."],

    },
    "Vantacite Monster":{
        type:"Vantacite Monster", 
        imgSrc:"/imgs/Enemy_Vantacite_Monster.png", 
        damage:95, 
        detectRange:500, 
        reloadTime:100, 
        speed:4, 
        health:750, 
        w:entitySize*2, 
        h:entitySize*2,
        lootTable : [
            {...holdableItems["Vantacite Sword"], generationProbability:20},
            {...holdableItems["Iron Sword"]},
            {...holdableItems["Gold Sword"]},
            {...holdableItems["Diamond Sword"]},
            {...holdableItems["Plasma Sword"]},
            {...holdableItems["Spear"]},
        ], 
        giveXP : 2000,
        generationProbability:10, //spawns in special occasions
        deathMessages:["You died from a vantacite monster.", "A vantacite monster squashed you.", "You saw a vantacite monster."],

    }
}

//initialize boss
var bossID = "Boss"
//var bossSpawned = false
toggleOpeningsToArena(true)
worlds["Main"].enemies[bossID] = new Boss()

/**************************** @PROJECTILES *************/
const projectilesObj = {
    "Arrow":{
        name:"Arrow",
        damage:holdableItems["Arrow"].damage,
        flightDuration:10,
        imgSrc:"/imgs/Arrow.png",
        speed:10
    },
    "Spear":{
        name:"Spear",
        damage:holdableItems["Spear"].damage,
        flightDuration:50,
        imgSrc:"/imgs/Spear.png", 
        speed:20
    }
}
class Projectile{
    constructor(worldID, name, x, y, w, h, dir, whoShot, durability, speed=null, duration=null, damage=null){
        this.worldID = worldID
        this.name = name //key inside holdable items!
        this.x = x
        this.y = y
        this.rotation = dir + Math.PI/2//for drawing (neds to be rotwated 90 deg)
        this.direction = dir //for direction purposes
        this.speed = speed?speed:projectilesObj[name].speed
        this.duration = duration?duration:projectilesObj[name].flightDuration
        this.damage = damage?damage:projectilesObj[name].damage

        this.imgSrc = projectilesObj[name].imgSrc
        this.width = w
        this.height = h


        this.whoShot = whoShot

        this.durability = durability
    }
}
function createArrow(entity, arrowDirection, holdDuration, worldID="Main"){
    let world = worlds[worldID]
    world.projectiles[createID()] = new Projectile(
        worldID,
        "Arrow", 
        entity.x + Math.cos(arrowDirection) * entitySize, 
        entity.y + Math.sin(arrowDirection) * entitySize, 
        50, 50, arrowDirection, entity, holdableItems["Arrow"].durability,
        projectilesObj["Arrow"].speed + 2.5 * (holdDuration-1), //ZOOM
        projectilesObj["Arrow"].flightDuration + 10 * (holdDuration-1), //wee! 
        projectilesObj["Arrow"].damage + 5 * (holdDuration-1), //that's gotta hurt
    )
}
function dealDamageTo(damage, from, to, projectileKey=null, worldID="Main"){
    let world = worlds[worldID]
    //deal initial damage...first...are they immune
    if(to.immuneDuration <= 0) { to.health -= damage } 
    //they are, I guess...
    //bosses have an exception...
    else if(to.type !== "Boss") { to.immuneDuration -= damage * 10 } //deal damage to immunity instead 
    
    // dead...?
    if(to.health <= 0){
        // from bots
        if(from.username=="BOT_Enemy") {
            let data = enemyObj[from.type]
            to.deathMessage = data.deathMessages[random(data.deathMessages.length-1, 0)]
        }
        //all else...
        else{
            var key = projectileKey
            // from projectiles...player + bot
            if(projectileKey){
                // death by arrow
                if(!world.projectiles[key] || !world.projectiles[key].whoShot){
                    to.deathMessage = "You were shot by an archer..."
                } else if (world.entities.hasOwnProperty(world.projectiles[key].whoShot.id)) {
                    /** IMPORTANT NOTE:
                     * In this case, the "to" is who died because of
                     * the "from", in this case, the projectile.
                     * "whoShotIt" is defined as the archer/thrower
                     */
                    // If entity is killed, update player's stats
                    let whoShotIt = world.projectiles[key].whoShot.username;
                    //spear
                    let messages = (from.name=="Spear")?[
                        `${to.username} was impaled by a spear`,
                        `${to.username} was impaled by ${whoShotIt}'s spear`,
                    ]:[ //arrow...
                        `${whoShotIt} killed ${to.username} with a ${from.name}.`,
                        `${whoShotIt} shot ${to.username}.`,
                        `The ${from.name} from ${whoShotIt} found its mark on ${to.username}.`,
                        `${to.username} was sniped from afar by ${whoShotIt} with an ${from.name}.`
                    ]
                    let p = world.entities[world.projectiles[key].whoShot.id];
                    p.xp += to.xp;
                    p.kills++;
                    let name = p.username
                    if(to.username && to.username == p.username) name = "yourself."
                    to.deathMessage = messages[Math.floor(Math.random() * messages.length)]
                } 
                //archer!
                else{
                    let data = enemyObj["Archer"]
                    to.deathMessage = data.deathMessages[random(data.deathMessages.length-1, 0)]
                    //console.log("An archer shot ", to.username, to.id)
                }
            } 
            // from player melee
            else {
                from.xp += Math.floor(to.xp * 0.8 )// give player xp
                from.kills ++
                to.deathMessage = `${to.username} was slain by ${from.username}`
                //console.log(to.deathMessage)
            }
        }
        console.log(to.deathMessage)
    }
}

//asign obstacles
worlds["Main"].obstacles = Object.assign({}, worlds["Main"].structures, worlds["Main"].trees)


/*************************** @SERVER_GAME_LOOOOOP *************/
var startedCountdown = false
var bossCountDownTime = 0; //BOSS COUNTDOWN TIMER ... already spawned in?
var bossCountDownTimeMax = 120 //s
const FPS = 50 //
setInterval(()=>{
    for(let worldID in worlds){
        let world = worlds[worldID]
        //spawn in boss?
        //console.log(bossCountDownTime)
        if(worldID == "Main"){
            if (!world.enemies[bossID] && !startedCountdown){
                toggleOpeningsToArena(false);
                startedCountdown = true
                bossCountDownTime = bossCountDownTimeMax; // seconds  
                let countdownInterval = setInterval(() => {
                    bossCountDownTime--;
            
                    if (bossCountDownTime === 0) {
                        clearInterval(countdownInterval); // Stop the countdown interval
                        toggleOpeningsToArena(true)
                        world.enemies[bossID] = new Boss()
                        startedCountdown = false
                        console.log("The boss has entered the arena.");
                    }
                }, 1000);
            }
        }
        //Spawn in enemies (chance of)
        if(Object.keys(world.enemies).length < maxEnemyCount){
            var randomKey = Object.keys(enemyObj)[random(Object.keys(enemyObj).length-1, 0)]
            if(random(100, 1) < enemyObj[randomKey].generationProbability){
                var nC = findSpawn(entitySize, worldID)
                let id = createRandomString(20)
                if(randomKey === "Archer"){
                    world.enemies[id] = new Archer(nC.x, nC.y, id, worldID)
                } else{
                    world.enemies[id] = new Enemy(randomKey, nC.x, nC.y, id, worldID)
                }
            }
        }
        //the boss has no immune!...
        if(world.enemies[bossID]) world.enemies[bossID].immuneDuration = 0
        //Move and update enemies' health
        for(let e in world.enemies){
            //...unless there is a lord...
            if(worldID == "Main" && world.enemies[e].type == "Summoned Lord"){
                world.enemies[bossID].immuneDuration = maxImmuneDuration
            }
            world.enemies[e].move()
            if(world.enemies[e].health <= 0) {
                let pick = random(world.enemies[e].lootTable.length-1, 0) 
                //find if percentage beats
                //drop one thing...only one......
                if(random(100, 1) <= world.enemies[e].lootTable[pick].generationProbability){
                    let loot = world.enemies[e].lootTable[pick]
                    var id = createID()
                    world.pickables[id] = new Pickable(
                        id, 
                        world.enemies[e].x, 
                        world.enemies[e].y, 
                        loot, 
                        0, loot.durability, loot.stackSize)
                }
                dropAll(world.enemies[e].id, "enemy")
                delete world.enemies[e]
            }
        }

        //manage player vars
        for(let e in world.entities){
            let entity = world.entities[e]
            if(entity.health < entity.maxHealth){
                world.entities[e].health += 0.01
            }
            if(entity.health <= 0){
                world.entities[e].isDead = true // This player is NOW dead!!
            }
            if(entity.immuneDuration > 0){
                world.entities[e].immuneDuration -= 1 
            }
        }

        //add eatables, swords, etc.
        if(random(500,1)==1 && Object.keys(world.pickables).length < mapSize/50){ //50=max amount of eatables at one time
            let spawnLocation = findSpawn(pickableSize, worldID) //find a suitable place to generate
            let kind
            if (random(4, 1) == 1){
                kind = "Health"
            } else if(random(2, 1) == 1){
                kind = "Speed"
            } else{
                kind = "Coin"
            }
            var pid = createRandomString(20)
            world.pickables[pid] = new Pickable(pid, spawnLocation.x, spawnLocation.y, coins[kind])
        }

        //add loot 0.1% chance
        if (random(1000, 1) == 1) {
            let spawnLocation = findSpawn(pickableSize, worldID)
            let randomKey = Object.keys(holdableItems)[Math.floor(Math.random() * Object.keys(holdableItems).length)] // rand key in holdableItems
            let gProb = holdableItems[randomKey].generationProbability;
            let gen = random(100, 1) < gProb
            if (gen) {
                var pid = createRandomString(20)
                world.pickables[pid] = new Pickable(
                    pid,
                    spawnLocation.x,
                    spawnLocation.y,
                    holdableItems[randomKey],
                    0,
                    holdableItems[randomKey].durability
                );
            }
        }

        // Update particles
        for (let key in world.particles) {
            let particle = world.particles[key];
            if(particle.duration > 1){
                world.particles[key].duration -= 1
            } else{
                delete world.particles[key]
            }

        }

        // Update projectiles
        for (let key in world.projectiles) {
            let projectile = world.projectiles[key];
            // Check if projectile is out of the world
            let projectileOut = {x:null,y:null}
            if(projectile.x < world.BORDERS.L){
                projectileOut.x = world.BORDERS.L
            } else if(projectile.x > world.BORDERS.R){
                projectileOut.x = world.BORDERS.R
            }
            if(projectile.y < world.BORDERS.D){
                projectileOut.y = world.BORDERS.D
            } else if(projectile.y > world.BORDERS.U){
                projectileOut.y = world.BORDERS.U
            }
            if ((projectileOut.x || projectileOut.y) || projectile.duration <= 0) {
                if(projectile.durability > 0){
                    // Create a pickable object at projectile's position
                    var pid = createRandomString(20)
                    world.pickables[pid] = new Pickable(
                        pid, 
                        projectileOut.x?projectileOut.x:projectile.x, 
                        projectileOut.y?projectileOut.y:projectile.y, 
                        projectile,
                        projectile.rotation, 
                        projectile.durability);
                }
                delete world.projectiles[key];
                break;
            } else {
                projectile.duration -= 1; // Update projectile duration
            }

            // Check collision with walls
            let collision = checkCollision(worlds[projectile.worldID].obstacles, projectile.x, projectile.y, projectile.speed * Math.cos(projectile.direction), projectile.speed * Math.sin(projectile.direction), projectile.whoShot.onWall, projectile, false, projectile.width == projectile.height ? projectile.width : Math.max(projectile.width, projectile.height), projectile.worldID);
            
            // Check if the projectile goes out of bounds
            if (!(projectile.x + collision.tx > world.BORDERS.L && projectile.x + collision.tx < world.BORDERS.R && projectile.y + collision.ty > world.BORDERS.D && projectile.y + collision.ty < world.BORDERS.U)) {
                collision = { tx: 0, ty: 0 };
            }
            
            // Drop projectile if it stops
            if (collision.tx === 0 || collision.ty === 0){
                if( projectile.durability > 0){
                    // Create a pickable object at projectile's position
                    var pid = createRandomString(20)
                    world.pickables[pid] = new Pickable(
                        pid, 
                        projectile.x, 
                        projectile.y, 
                        projectile, 
                        projectile.rotation, 
                        projectile.durability
                    );
                }
                delete world.projectiles[key];
            }

            // Update projectile position
            projectile.x += collision.tx;
            projectile.y += collision.ty;

            // Damage entities and enemies
            let damageables = [world.entities, world.enemies];
            damageables.forEach(obj => {
                for (let k in obj) {
                    let entity = obj[k];
                    // Check if projectile hits entity
                    if (projectile.x > entity.x - entitySize / 2 &&
                        projectile.x < entity.x + entity.width - entitySize / 2 &&
                        projectile.y > entity.y - entitySize / 2 &&
                        projectile.y < entity.y + entity.height - entitySize / 2) {
                        // Decrease entity health by projectile damage
                        dealDamageTo(projectile.damage, projectile, entity, key, projectile.worldID)
                        
                        if(projectile.durability != Infinity 
                        && projectile.durability > 0){
                            var pid = createRandomString(20)
                            world.pickables[pid] = new Pickable(
                                pid, 
                                projectile.x, 
                                projectile.y, 
                                projectile,
                                projectile.rotation, 
                                projectile.durability
                            );
                        }
                        delete world.projectiles[key];
                        break;
                    }
                }
            });
        }

        //update world.pickables (despawn?)
        for(let key in world.pickables){
            let pickable = world.pickables[key]
            pickable.despawnIn -= 1
            if(pickable.despawnIn <= 0){
                delete world.pickables[key]
            }
        }
    }
}, FPS)

/*************************** @SOCKET *************/
//what to do when a player connects
var io = require("socket.io")(serv,{})
io.sockets.on("connection", (socket)=>{
    console.log("New Socket Connection")

    var global_player //global var of player, when defined

    socket.emit("allowUpdate") // allow to start
    
    //
    socket.on("askForStartData", function(data){
        let nC = findSpawn(entitySize, data.worldID)
        let player = new Player(nC.x, nC.y, data.username, `/imgs/${data.img}.png`, data.worldID)
        //var worldID = "Main"
        if(data.worldID in worlds){
            var world = worlds[data.worldID]
            let entities = world.entities //identify entities
            entities[player.id] = player //add player to pool
            socket.emit("sendStartData", {
                bordersObj:world.BORDERS,
                structuresObj: world.structures, //send for map
                player:player,
                mapSize:mapSize,
                entitySize:entitySize,
                walls: Object.values(world.structures), //send for map
                lakes: Object.values(world.lakes), //send for map
                markets: Object.values(world.markets), //send for map
                holdables: holdableItems,
                //speedFactor: speedFactor, //how much one is affected by a speed boost (sprint)
                maxImmuneDuration:maxImmuneDuration //maximum immune time
            })
            console.log("Player ", player.username, player.id, "joined ", data.worldID, " world")
        } else console.log("NO world existing...", data.worldID)
    }) 

    //update player (all vital info)
    socket.on("updatePlayer", (data)=>{
        if(data.worldID && data.worldID in worlds){
            let player = data.player
            let world = worlds[data.worldID]
            let id = player.id //update!
            if(world.entities[player.id]) {
                let entity = world.entities[player.id];
                //what is updated, the rest is locked (remember to put in IF as well)
                let { id, x, y, rotation, invSelected, speed, onWall, inventory } = player

                Object.assign(entity, { x, y, rotation, invSelected, speed, onWall });

                if (data.reorder) entity.inventory = inventory; //only update inventory if reordering...
            } else if(id && !player.isDead){
                console.log("ID", id, "was added to pool")
                // put on top of wall if regenerated
                for (let w in worlds[data.worldID].obstacles) {
                    let obstacle = worlds[data.worldID].obstacles[w];
                    if(obstacle.class=="Wall"){
                        if (obstacle.x - obstacle.width / 2 < player.x 
                        && player.x > obstacle.x + obstacle.width / 2 
                        && obstacle.y - obstacle.height / 2 < player.y 
                        && player.y > obstacle.y + obstacle.height / 2) {
                            console.log("Put player on wall.");
                            player.onWall = true;
                            break;
                        }
                    } else if(obstacle.class=="Tree"){
                        if (Math.sqrt(Math.pow(obstacle.x-player.x,2) + Math.pow(obstacle.y-player.y,2)) < obstacle.obstructionRadius + entitySize) {
                            console.log("Put player on tree.");
                            player.onWall = true;
                            break;
                        }
                    }
                }
                //
                socket.emit("reupdate", {
                    bordersObj:world.BORDERS,
                    structuresObj: world.structures,
                    mapSize:mapSize,
                    entitySize:entitySize,
                    walls: Object.values(world.structures),
                    lakes: Object.values(world.lakes),
                    markets: Object.values(world.markets),
                    //speedFactor, speedFactor,
                    maxImmuneDuration: maxImmuneDuration
                }) //re updates updated game data.
            }

            global_player = player
        }
    })

    //give data if requested (still active if player is dead)
    socket.on("requestUpdateDataFromServer", (data)=>{
        let world = worlds[data.worldID]
        let entities = world.entities
        let id = data.id
        let player = entities[data.id]
        let updateContent = [world.borderRect] //always have the border

        let players = Object.values(entities).filter(player => !player.isDead) //filter out the "alive players"

        if(data.worldID){
            let world = worlds[data.worldID]

            let updateLi = [
                world.lakes, world.markets, world.structures, //landmarks
                world.particles, //um...
                players, world.enemies, //entities
                world.pickables, world.projectiles, //items
                world.trees //um....
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
            //ONLY dies if send death message!!
            if(player && player.isDead){// player.health <= 0
                dropAll(id)
                delete worlds[data.worldID].entities[id]
                socket.emit("gameOver")
            }

            //if in range
            socket.emit("sendUpdateDataToClient", {
                updateContent: updateContent,
                player: player,
                serverPlayerCount: Object.keys(world.entities).length,
                leaderboard: Object.values(world.entities)
                .sort((a, b) => b.kills - a.kills)
                .slice(0, 5)
                .map(player => ({ username: player.username, kills: player.kills, xp: player.xp, id: player.id })), 
                structures:Object.values(world.structures)
            })
        }
    })

    //player eat/pick up, etc.! ADD TO Inventory 
    socket.on("eat", (data)=>{
        let item = data.what
        let world = worlds[data.worldID]
        let entities = world.entities
        let player = entities[data.id]
        if(player){
            //if it is a coin...
            if(item.name == "Coin"){
                player.xp += coins[item.name].xpAmount
                delete world.pickables[item.id]
            } else if(item.name == "Speed"){
                player.xp += coins[item.name].xpAmount

                socket.emit("speed")
                delete world.pickables[item.id]
            } else if(item.name == "Health"){
                player.xp += coins[item.name].xpAmount
                if (player.health<player.maxHealth-25) {
                    player.health += 25 
                } else {player.health = player.maxHealth} // +25 health points
                delete world.pickables[item.id]
            } 
            //otherwise it must be an item
            else {
                let inv = player.inventory;
                let taken = false //taken? picked up? etc.??
                //see if you already have it and group together
                for (let i in inv) {
                    // Check for stackable item
                    if(inv[i].name === item.name 
                    && inv[i].stackSize < inv[i].maxStackSize) {
                        if(world.pickables[item.id].stackSize + inv[i].stackSize > inv[i].maxStackSize){
                            let increase = inv[i].maxStackSize - (inv[i].stackSize)
                            inv[i].stackSize += increase //added to inv
                            world.pickables[item.id].stackSize -= increase //added to inv
                            item = world.pickables[item.id] //update item
                        }
                        else{
                            inv[i].stackSize += world.pickables[item.id].stackSize
                            delete world.pickables[item.id];
                            taken = true //set to TRUE                   
                            break;   
                        } 
                    } 
                }
                //put in hand if not taken
                if(!taken){
                    for (let i in inv) {//*&*&*&
                        if (inv[i].name === "Hand") {
                            // Replace with new item
                            let nItem = { ...holdableItems[item.itemName], stackSize:item.stackSize, durability:item.durability}
                            player.inventory[i] = nItem;
                            delete world.pickables[item.id];
                            break;
                        }
                    }
                }
            }
        }
    })

    //player drop item
    socket.on("drop", (data)=>{
        let world = worlds[data.worldID]
        let entities = world.entities
        let id = data.id
        let player = entities[data.id]
        let x = data.x
        let y = data.y
        //see if out of boundaries
        if (data.x <= world.BORDERS.L){
            x = world.BORDERS.L
        } else if(data.x >= world.BORDERS.R){
            x = world.BORDERS.R
        }
        if (data.y <= world.BORDERS.D){
            y = world.BORDERS.D
        } else if(data.y >= world.BORDERS.U){
            y = world.BORDERS.U
        }
        let item = player.inventory[data.playerInvI]
        if(item.name != "Hand"){
            var pid = createRandomString(20)
            world.pickables[pid] = new Pickable(pid, x, y, item, 0, item.durability, data.allDrop?item.stackSize:1)

            if(data.allDrop || entities[id].inventory[player.invSelected].stackSize == 1) entities[id].inventory[player.invSelected] = {...holdableItems["Hand"]}
            else entities[id].inventory[player.invSelected] = {...entities[id].inventory[player.invSelected], stackSize: entities[id].inventory[player.invSelected].stackSize - 1}
        }
    })

    //deal damage or other mousedown/up events O.O 
    socket.on("mousedown", function(data){
        let world = worlds[data.worldID]
        let entities = world.entities
        let id = data.id
        let player = entities[data.id]
        if(player){
            let usedItem = false
            let tool = player.inventory[player.invSelected]
            //ranged attack
            if (tool.name === "Bow") {
                // Shoot arrow
                if (player.inventory.some(invSlot => invSlot.name === "Arrow")){
                    let holdDuration = (data.holdDuration>=5)?5:data.holdDuration //max = Bow5.png
                    player.inventory[player.invSelected].imgSrc = `/imgs/Bow${holdDuration}.png`
                }
                    
                
            } else if(tool.name === "Spear"){
                let spearDirection = player.rotation + player.defaultRotation + Math.PI;
                
                tool.durability -= 1

                world.projectiles[createID()] = new Projectile(
                    data.worldID,
                    "Spear", 
                    player.x + Math.cos(spearDirection) * entitySize, 
                    player.y + Math.sin(spearDirection) * entitySize, 
                    50, 50, spearDirection, player, tool.durability);
                player.inventory[player.invSelected] = {...holdableItems["Hand"]}
                usedItem = true // item was used!
            } 
            //melee attack         
            else {
                let didDamage = false
                let damage = (tool.durability === Infinity || !tool.durability)?holdableItems["Hand"].damage:holdableItems[tool.name].damage
                
                //let hitRange = (player.inventory[player.invSelected].hitRange?player.inventory[player.invSelected].hitRange:entitySize) * data.scale
                
                let mouseX = data.x
                let mouseY = data.y
                let world = worlds[data.worldID]

                for(let e in world.entities){    
                    let entity = world.entities[e]            
                    if(//Math.sqrt(Math.pow(entity.x - player.x, 2) + Math.pow(entity.y - player.y, 2)) < hitRange
                    //&& 
                    entity.id != id
                    && entity.x - entity.width/2 < mouseX 
                    && entity.x + entity.width/2 > mouseX
                    && entity.y - entity.height/2 < mouseY 
                    && entity.y + entity.height/2 > mouseY
                    ){
                        dealDamageTo(damage, player, entity, null, data.worldID)
                        didDamage = true // turn to true
                    }
                }
                for(let e in world.enemies){    
                    let entity = world.enemies[e]
                    if(//Math.sqrt(Math.pow(entity.x - player.x, 2) + Math.pow(entity.y - player.y, 2)) < hitRange
                    //&& 
                    entity.x - entity.width/2 < mouseX 
                    && entity.x + entity.width/2 > mouseX
                    && entity.y - entity.height/2 < mouseY 
                    && entity.y + entity.height/2 > mouseY){
                        dealDamageTo(damage, player, entity, null, data.worldID)                      
                        didDamage = true // turn to true
                    }
                }
                if(didDamage && tool.durability != null){
                    tool.durability -= 1 //DAMAGE Tool
                    usedItem = true // item was used!
                }
            }

            if(tool.class == "UseUpErs"){
                //perform actions
                //ACTIVATE FORCE SHIELD
                if(player.inventory[player.invSelected].name == "Force Shield"){
                    if(player.inventory[player.invSelected].immuneDuration + player.immuneDuration > maxImmuneDuration){ 
                        player.immuneDuration = maxImmuneDuration
                    } else {
                        player.immuneDuration += player.inventory[player.invSelected].immuneDuration
                    }
                }
                //decrease quantity
                tool.stackSize -= 1
                if(tool.stackSize == 0){
                    player.inventory[player.invSelected] = {...holdableItems["Hand"]}
                }
            }

            //BREAK TOOL? Is the tool too weak?
            if(player.inventory[player.invSelected].durability <= 0 
            && player.inventory[player.invSelected].durability!=null){
                player.inventory[player.invSelected] = {...holdableItems["Hand"]}
                usedItem = false // item was used...but destroyed
            }

            if (usedItem) {socket.emit("giveInventoryItemCooldownTime", {id:data.invID})}
        }
    })
    socket.on("mouseup", function(data){
        let world = worlds[data.worldID]
        let entities = world.entities
        let player = entities[data.id]

        if(player){
            let tool = player.inventory[player.invSelected]
            let holdDuration = (data.holdDuration>=5)?5:data.holdDuration //max = Bow5.png
            if (tool.name === "Bow"
            && holdDuration > 0
            ) {
                // Check for arrow in inventory
                let canShoot = player.inventory.some(invSlot => invSlot.name === "Arrow");
                // Shoot arrow
                if (canShoot) {
                    player.inventory[player.invSelected].imgSrc = `/imgs/Bow.png`
                    let arrowDirection = player.rotation + player.defaultRotation + Math.PI;
                    
                    //make da arrow
                    createArrow(player, arrowDirection, holdDuration, player.worldID)

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
                    usedItem = true // item was used!
                }
            }
        } 
    })
    //buy
    socket.on("buy", function(data){
        let world = worlds[data.worldID]
        let entities = world.entities
        let player = entities[data.id]
        let boughtItem = data.item

        player.xp -= boughtItem.cost
        var pid = createRandomString(20)
        world.pickables[pid] = new Pickable(pid, player.x, player.y, boughtItem, 0, boughtItem.durability, boughtItem.stackSize)

        //emit bought!
        socket.emit("bought!", {newXp:player.xp})
    })

    //boss respawn?
    socket.on("GetCountdownInfo", function(data){
        let world = worlds[data.worldID]
        let entities = world.entities
        let player = entities[data.id]

        if(player){
            let ret = bossCountDownTime //emit value

            //additional area (padding)
            let aPad = 1.5 //area x __ == actual area detection
            if(!(player.x > mainStructureCenter.x - (structureW/2) * (wallSize * aPad)
            && player.x < mainStructureCenter.x + (structureW/2) * (wallSize * aPad)
            && player.y > mainStructureCenter.y - (structureH/2) * (wallSize * aPad)
            && player.y < mainStructureCenter.y + (structureH/2) * (wallSize * aPad) 
            && bossCountDownTime > 0)) ret = null //emit only when in range...
            
            socket.emit("SendCountdownInfo", {
                time:ret
            })
        }
    })

    //add particles?
    socket.on("addParticles", function(data){
        if(data && data.worldID){
            let world = worlds[data.worldID]
            if(!worlds[data.worldID].particleTimeouts[data.id]){
                //creates new particle...
                let id = createID()
                world.particles[id] = new Particle(data.x, data.y)
                //particle timeout manages time til disappear
                world.particleTimeouts[data.id] = setTimeout(()=>{
                    delete world.particleTimeouts[data.id]
                }, particleFrequency)
            }
        }
    })

    //disconnect
    socket.on('disconnect', function() {
        try{
            console.log(`${global_player.username} ${id} disconnected`)
            delete worlds[global_player.worldID].entities[global_player.id]
        }
        catch(err){
            if(global_player){
                console.log("A player left the server and closed the tab...", global_player.id)
                delete worlds[global_player.worldID].entities[global_player.id]
            } else console.log("The player just left...")
        }
    })
    socket.on("playerClosedTab", function(data){
        if(data.worldID && worlds[data.worldID] && data.player && data.player.id && worlds[data.worldID].entities[data.player.id]){
            dropAll(data.player.id)
        }
    })    
})