import { MAX_LOAD, MAX_IMMUNE_DURATION, entitySize, holdableItems, checkCollision, getOnWallStatus, random, entityImgSrcs, loadingStatuses, percentSpeedReduction } from "./client/functions.js"

//const { spawn } = require("child_process")
//const { log, Console } = require("console")
//const { create } = require("domain")
//var express = require("express")
//const { Socket } = require("socket.io")
var app = express()
//var serv = require("http").Server(app)
import express from 'express';
import { ClientRequest, Server } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs'

// Place this at the very top, after your imports:
var allImgs = [];
var folderPath = './client/imgs';
try {
    const files = fs.readdirSync(folderPath);
    files.forEach(file => {
        allImgs.push(String(file));
    });
    console.log("Successfully copied all IMG paths in ./client/imgs/");
} catch (err) {
    console.error('Unable to scan directory: ' + err);
}


var app = express();
var serv = Server(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//send index.html
app.get("/", function(req, res){
    res.sendFile(__dirname + "/client/index.html")
})
//send other stuff
app.use("/imgs", express.static(__dirname + "/client/imgs"));
app.use("/client", express.static(__dirname + "/client"))

const PORT = process.env.PORT || 1111 //server PORT
serv.listen(PORT)
console.log("RUNNING Online @ " + PORT)

const DEBUG = false

/************ FUNCTIONS *********************/

function createRandomString(l=10, specialCharacters=true){
    var pool = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' 
    if(specialCharacters) pool += "/?!@#$%&-=+[]{}|;:<>,.* "
    var ret_string = ""
    for(var i = 0; i < l; i ++){
        ret_string += pool[random(0, pool.length)]
    }
    return ret_string
}
//CREATE NEW IDs
function createID(){
    /*GENERATE ID*/
    let id = createRandomString() //rand id
    while (id in ids){id = createRandomString()}
    ids.push(id) //keep track of all ids
    return id
}

function removeID(id) {
    const idx = ids.indexOf(id);
    if (idx !== -1) ids.splice(idx, 1);
}

var ids = [] //player ids list

// KillEntity: Handles all entity death logic and cleanup
function KillEntity(entityID, worldID, from, projectileKey=null) {
    if (!entityID || !worlds[worldID].entities[entityID] || !worlds[worldID]) return;
    let entity = worlds[worldID].entities[entityID];
    let world = worlds[worldID];

    let to = entity
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
        }
    } 
    // from player melee
    else {
        if(from.kindOfEntity == "Bot") {
            let data = enemyObj[from.type]
            to.deathMessage = data.deathMessages[random(data.deathMessages.length-1, 0)]
        } else {
            to.deathMessage = `${to.username} was slain by ${from.username}`
        }
        from.xp += Math.floor(to.xp * 0.8 )// give player xp
        from.kills ++
    }
    // Drop inventory if it has one (player or bot)
    if (entity.inventory && Array.isArray(entity.inventory)) {
        dropAll(entity.id, worldID);
    }

    // Drop loot for enemies
    if (entity.lootTable && Array.isArray(entity.lootTable)) {
        let pick = random(entity.lootTable.length - 1, 0);
        let loot = entity.lootTable[pick];
        if (random(100, 1) <= (loot.generationProbability ?? 100)) {
            var id = createID();
            world.pickables[id] = new Pickable(
                id,
                entity.x,
                entity.y,
                loot,
                0,
                loot.durability,
                loot.stackSize
            );
        }
    }

    // Special splitting logic for Vantacite Monsters
    if (entity.type == "Vantacite Monster") {
        let spread = enemyObj["Small Vantacite Monster"].w * 3;
        summon("Small Vantacite Monster", entity.x, entity.y, spread, 2, worldID);
    } else if (entity.type == "Small Vantacite Monster") {
        let spread = enemyObj["Tiny Vantacite Monster"].w * 3;
        summon("Tiny Vantacite Monster", entity.x, entity.y, spread, 4, worldID);
    } else if (entity.type == "Tiny Vantacite Monster") {
        let spread = enemyObj["Very Tiny Vantacite Monster"].w * 3;
        summon("Very Tiny Vantacite Monster", entity.x, entity.y, spread, 4, worldID);
    }

    // Mark as dead and remove ID
    entity.isDead = true;
    entity.health = 0;

    if(entity.isPlayer && entity.socketId && io.sockets.sockets.has(entity.socketId)) {
        removeID(entity.id);
    } else{
        delete world.entities[entity.id];
    }

    // Emit gameOver to the player if this is a player entity
    if (entity.isPlayer && entity.socketId && io.sockets.sockets.has(entity.socketId)) {
        io.to(entity.socketId).emit("gameOver");
    }
}

/************ MAP SIZE *********************/
const defaultMapSize = 4000 //px

/************ WORLDS *********************/
class World {
    constructor(id, mp=defaultMapSize, amountOfEnemies=10, amountOfTrees=1000, amountOfLakes=4, amountOfStructures=10, amountOfPickables=100, amountOfMarkets=3){
        this.id = id
        this.mapSize = mp

        this.entities = {} //bots and players
        this.trees = {}
        this.lakes = {}

        this.structures = {}
        this.escapesData = []
        this.escapesIDs = {}

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
            x:0,///-this.mapSize/4,
            y:0,///-this.mapSize/4,
            width:this.mapSize,
            height:this.mapSize,
            isRect:true,
            color:"rgb(34, 60, 33)"
        }

        this.amountOfEnemies=amountOfEnemies
        this.amountOfTrees=amountOfTrees
        this.amountOfLakes=amountOfLakes
        this.amountOfStructures=amountOfStructures
        this.amountOfPickables=amountOfPickables
        this.amountOfMarkets=amountOfMarkets

        this.obstacles = {}
    }
}
var worlds = {}

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

var mainStructureCenter = {x:0,y:0}
var mainStructureBlueprint = [
    [ "N", "S", "W", "W", "W", "W", "W", "W", "W", "W", "S", "N" ],
    [ "S", "W", "E", "N", "N", "N", "N", "N", "N", "E", "W", "S" ],
    [ "W", "E", "N", "N", "W", "N", "N", "W", "N", "N", "E", "W" ],
    [ "W", "N", "N", "N", "W", "N", "N", "W", "N", "N", "N", "W" ],
    [ "W", "N", "W", "W", "S", "N", "N", "S", "W", "W", "N", "W" ],
    [ "W", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "W" ],
    [ "W", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "W" ],
    [ "W", "N", "W", "W", "S", "N", "N", "S", "W", "W", "N", "W" ],
    [ "W", "N", "N", "N", "W", "N", "N", "W", "N", "N", "N", "W" ],
    [ "W", "E", "N", "N", "W", "N", "N", "W", "N", "N", "E", "W" ],
    [ "S", "W", "E", "N", "N", "N", "N", "N", "N", "E", "W", "S" ],
    [ "N", "S", "W", "W", "W", "W", "W", "W", "W", "W", "S", "N" ],
]
    
var mainStructureW = mainStructureBlueprint[0].length; // width
var mainStructureH = mainStructureBlueprint.length; // height (making it a square)
const wallSize = 100

function findStairRotation(row, column, blueprint, indicator="S"){
    let r = row
    let c = column
    let possibleRotations = []

    if(DEBUG) console.log(blueprint, r, c)

    if(blueprint[r][c] !== indicator){
        if(DEBUG) console.log("This is not a stair!")
        return null
    }
    
    if(blueprint[r-1] && blueprint[r-1][c]
        && blueprint[r-1][c] == "W"
    ){
        if(DEBUG) console.log("Somethin' is above this...")
        possibleRotations.push(0)
    }
    if(blueprint[r+1] && blueprint[r+1][c]
        && blueprint[r+1][c] == "W"
    ){
        if(DEBUG) console.log("Somethin' is below this...")
        possibleRotations.push(Math.PI)
    }
    if(blueprint[r] && blueprint[r][c-1]
        && blueprint[r][c-1] == "W"
    ){
        if(DEBUG) console.log("Somethin' is left of this...")
        possibleRotations.push(Math.PI*3/2)
    }
    if(blueprint[r] && blueprint[r][c+1]
        && blueprint[r][c+1] == "W"
    ){
        if(DEBUG) console.log("Somethin' is right of this...")
        possibleRotations.push(Math.PI/2)
    }
    if(DEBUG) console.log(possibleRotations, possibleRotations[0])
    //if stair is by itself (0) or if surrounded (all 4) make it a wall...
    if (possibleRotations.length == 0 || possibleRotations.length == 4
    ) return -1
    // else return one possible rotation
    else return possibleRotations[random(possibleRotations.length-1, 0)] 
}

function toggleOpeningsToArena(escapesLocked, worldID="Main"){
    let world = worlds[worldID]
    if(!world) return
    // Probably only Main
    if(!escapesLocked){
        let i = 0
        for(let e in world.escapesData){
            let obj = world.escapesData[e]
            let id = `"Escapes${i}`
            // See findStairRotation() in Main World structure
            // for explanation of column first then row 
            // in function.
            world.structures[id] = new Stairs(obj.x, obj.y, id, wallSize, findStairRotation(obj.c, obj.r, obj.blueprint, "E")/*obj.r==1?270*(Math.PI/180):90*(Math.PI/180)*/)
            world.escapesIDs.push(id)
            i++
        }
    } else{
        for(let i in world.escapesIDs){
            let id = world.escapesIDs[i]
            delete world.structures[id]
        }
        world.escapesIDs = []
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

/**************************** @PARTICLES *************/
/**
 * Particles are for animation, when an object steps
 * in water, climbs walls?, etc. For animation purposes.
 */
const particlesObj = {
    "lake":{
        color: "#28707430",
        duration: 95,
        radiusMin: entitySize / 2,
        radiusMax: entitySize * 2,
        isCircle: true,
        imgSrc: null
    }
}

class Particle{
    constructor(key, x, y, worldID="Main"){
        let particleData = particlesObj[key]
        this.key = key
        this.x = x
        this.y = y
        this.duration = particleData.duration
        this.color = particleData.color
        this.size = particleData.radiusMin
        this.radius = particleData.radiusMax

        this.isCircle = particleData.isCircle

        this.worldID = worldID
    }
}

const particleFrequency = 1000 // 
function createParticle(world, x, y, fromID){
    if(random(100, 1) > 20){
        world.particles[createRandomString(100)] = new Particle("lake", x, y)
        //particle timeout manages time til disappear
        world.particleTimeouts[fromID] = setTimeout(()=>{
            delete world.particleTimeouts[fromID]
        }, particleFrequency)
    }
}

/**************************** @MARKETS *************/
const marketSize = 200
class Market{
    constructor(worldID, x, y, ID, imgSize=marketSize) {
        this.x = x;
        this.y = y;
        this.id = ID;
        this.imgSrc = "/imgs/Market.png";
        this.width = imgSize;
        this.height = imgSize;

        this.worldID = worldID
    }
}

/**************************** @TREES *************/
class Tree {
    constructor(worldID, treesID, size=random(500,200)) {
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
        let mp = worlds[this.worldID].mapSize
        let x, y;
        let doNotPass = true;
        let tries = 0
        while (doNotPass) {
            //if tried more than 1000 times, just give up
            if(tries > 1000) {
                if (DEBUG) console.log("Tree --> give up generation")
                break
            }
            tries++
            doNotPass = false; // be optimistic, you know?
            x = random((mp / 2) - (s / 2), -(mp / 2) + (s / 2))
            y = random((mp / 2) - (s / 2), -(mp / 2) + (s / 2))
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

/************************** @SPAWN_FINDER *************/
function findSpawn(size=0, worldID="Main") {
    let s = size
    let x, y
    let doNotPass = true
    let mp = worlds[worldID].mapSize
    let tries = 0
    const MAX_TRIES = 100; // Lowered from 1000 to 100 for performance
    while (doNotPass) {
        if(tries > MAX_TRIES) break
        tries++
        doNotPass = false;
        x = random((mp / 2) - (s / 2), -(mp / 2) + (s / 2));
        y = random((mp / 2) - (s / 2), -(mp / 2) + (s / 2));
        let thisWorld = worlds[worldID]
        let li1 = [thisWorld.structures, thisWorld.markets, thisWorld.entities]
        li1.forEach(obj=>{
            for (let sKey in obj) {
                let st = obj[sKey];
                let p = 3;
                if (
                    x + s > st.x - p &&
                    x - s < st.x + st.width + p &&
                    y + s > st.y - p &&
                    y - s < st.y + st.height + p
                ) {
                    doNotPass = true;
                    break
                }
            }
        })
        for(let t in thisWorld.trees){
            let tree = thisWorld.trees[t]
            if(Math.sqrt(Math.pow(x-tree.x,2) + Math.pow(y-tree.y,2)) < tree.obstructionRadius + entitySize){
                doNotPass = true;
                break
            }
        }
        for(let l in thisWorld.lakes){
            let lake = thisWorld.lakes[l]
            let distance = Math.sqrt(Math.pow(x - lake.x, 2) + Math.pow(y - lake.y, 2));
            if(distance <= lake.radius){
                doNotPass = true;
                break
            }
        }
    }
    return { x, y };
}

function findSpawnAround(x, y, size, spread=entitySize*4, worldID="Main"){
    const MAX_TRIES = 20; // Lowered from 100 to 20 for performance
    let world = worlds[worldID]
    for(let i = 0; i < MAX_TRIES; i++){
        let rad = random(Math.round(Math.PI * 100 * 2), 0)/100
        let xx = x + Math.cos(rad) * random(spread, 0)
        let yy = y + Math.sin(rad) * random(spread, 0)
        for(let i in world.entities){
            let entity = world.entities[i]
            let distFromEntity = Math.sqrt(Math.pow(entity.x - xx, 2) + Math.pow(entity.y - yy, 2))
            if(size > distFromEntity){
                return { x:null, y:null }
            }
        }
        for(let i in world.obstacles){
            let obstacle = world.obstacles[i]
            let distFromObstacle = Math.sqrt(Math.pow(obstacle.x - xx, 2) + Math.pow(obstacle.y - yy, 2))
            if(size > distFromObstacle){
                return { x:null, y:null }
            }
        }
        var borders = world.BORDERS
        if(xx - size < borders.L
        || xx + size > borders.R
        || yy - size < borders.D
        || yy + size > borders.U){
            return { x:null, y:null }
        }
        return { x:xx, y:yy }
    }
}

function borderInPoints(x, y, worldID){
    let borders = worlds[worldID].BORDERS
    if(x < borders.L) x = borders.L
    else if (x > borders.R) x = borders.R

    if(y < borders.D) y = borders.D
    else if (y > borders.U) y = borders.U
    
    return { x, y }
}

/**************************** @PICKABLES *************/
//need to update Pickable class
const pickableSize = 10
class Pickable{
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
        xpAmount:250,
    }
}
//drop everything after death
/**
 * This function copies the inventory of an entity
 * in entities via the "id" parameter.
 */
function dropAll(id, worldID="Main"){
    let world = worlds[worldID]
    var from = world.entities[id]
    if(!from || !from.id) return
    console.log("Player left ID", from.id)
    if(from){
        from.inventory.forEach(slot=>{
            if(slot.name == "Bow"){
                slot = {...slot, imgSrc: "/imgs/Bow.png"} //change img src to Bow
            }
            if(slot.name != "Hand"){
                let scatterRange = entitySize * 2 // area of scattering items
                let x = random(from.x + scatterRange, from.x - scatterRange)
                let y = random(from.y + scatterRange, from.y - scatterRange)
                let borderCheckXY = borderInPoints(x, y, worldID)
                var id = createID()
                world.pickables[id] = new Pickable(id,borderCheckXY.x,borderCheckXY.y,slot,0,slot.durability,slot.stackSize)
            }
        })
    }
}

/**************************** @ENTITIES *************/
class Entity {
    constructor(type, imgSrc, speed, w, h, x, y, health, xp=0, id=createID(), knockbackDist=5, knockbackResistance=0, worldID="Main", rl="R", socketId) {
        this.id = id;
        this.class = "Entity"
        this.status = ["Wandering"]
        /**ALL STATUSES:
         * Wandering (default)
         * Attacking
         * Hitting
         * Shooting (Archers only)
         * Fleeing (Archers only)
         */
        this.x = x;
        this.y = y;
        this.knockbackDue = {
            x:0,
            y:0
        }
        this.knockbackDist = knockbackDist // hit back
        this.knockbackResistance = knockbackResistance * (0.01) //in percentage (e.g. 0%, 86%)
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
        this.kills = 0
        this.worldID = worldID

        this.rl = rl // RIGHTY OR LEFTY

        this.socketId = socketId //socket id
    }

    giveStatus(status) {
        if(status == "Wandering") {
            this.status = ["Wandering"]; //reset status to Wandering
            return //no need to give this status, it's default
        }

        /********** */
        var order = {
            "Wandering": -100,
            "Attacking": 1,
            "Hitting": 0,
            "Shooting": 0,
            "Spear1": 0,
            "Spear2": 1,
            "Spear3": 2,
            "Fleeing": 2,
        }; // Lower the value, higher the priority
    
        if (!this.status.includes(status)) {
            this.status.push(status);
        }
    
        // Sort the status array to ensure prioritized ones come first
        this.status.sort((a, b) => (order[a] || Infinity) - (order[b] || Infinity));
        this.status.reverse()

        //remove automatically in 250ms
        if (this.status.includes(status) && status !== "Spear3") {
            setTimeout(() => {
                if (this.status.includes(status) && !status.startsWith("Wandering")) {
                    this.status.splice(this.status.indexOf(status), 1);
                }
            }, 250);
        }
    }
}

class Player extends Entity{
    constructor(x, y, username, imgSrc=entityImgSrcs["Player1"], worldID, type="player", speed=10, w=entitySize, h=entitySize, health = 100, id="PLAYER"+createID(), inventory=[], xp=5000, socketId=null){
        super(type, imgSrc, speed * 2, w, h, x, y, health, xp, id, 5, 0, worldID)
        super.socketId = socketId //socket id of player DEFINED later
        this.username = (username == "")? "Player":username;
        this.kindOfEntity = "Player"
        this.inventory = inventory.length==0?[
            {...holdableItems[DEBUG?"Debug":"Spear"]},
            {...holdableItems["Hand"]},
            {...holdableItems["Hand"]},
            {...holdableItems["Hand"]},
            {...holdableItems["Hand"]},
        ]:inventory
        this.invSelected = 0
        this.hitSize = 40
        this.isPlayer = true
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

class Enemy extends Entity {
    constructor(enemyObjKey, onWall, x, y, id, worldID = "Main", inventory = [], invSelected = 0) {
        const enemy = enemyObj[enemyObjKey];
        super(enemy.type, enemy.imgSrc, enemy.speed, enemy.w, enemy.h, x, y, enemy.health, 0, id, enemy.knockbackDist, enemy.knockbackResistance, worldID);

        this.username = "BOT_Enemy";
        this.enemyKey = enemyObjKey
        this.kindOfEntity = "Bot"
        this.detectRange = enemy.detectRange;
        this.damage = enemy.damage;
        this.target = null;
        this.dx = 0;
        this.dy = 0;
        this.moving = false;
        this.justAttacked = false;
        this.cooldownTime = 0;
        this.cooldownDuration = enemy.reloadTime;
        this.cooldownSF = 1;
        this.lootTable = enemy.lootTable;
        this.xp = enemy.giveXP;

        this.inventorySize = 1;
        this.inventory = inventory.length === 0
            ? Array.from({ length: this.inventorySize }, () => ({ ...holdableItems["Hand"] }))
            : inventory;
        this.invSelected = invSelected;

        this.targetX = 0;
        this.targetY = 0;
        this.targetType = null;
        this.onWall = onWall;

        this.targetData = {};
        this.grudges = {} //ONLY IDS! OTHERWISE RECURSION!

        this.freeze = false
    }

    findTarget() {
        this.targetData = {};
        let minDist = this.detectRange;
        const world = worlds[this.worldID];
        const players = Object.values(world.entities).filter(entity => entity.isPlayer && !entity.isDead);
        // KK    
        for(let g in this.grudges){
            let grudgeID = this.grudges[g]
            if(!world.entities[grudgeID]){
                delete this.grudges[g]
                continue;
            }

            let grudgeXY = (({x, y}) => ({x, y}))(world.entities[grudgeID])
            if(!grudgeXY.x || !grudgeXY.y){
                delete this.grudges[g]
                continue;
            }
            const dist = Math.hypot(grudgeXY.x - this.x, grudgeXY.y - this.y);
            if (dist < minDist) {
                minDist = dist;
                this.targetData = { key: grudgeID, targetType: "player" };
            }
        }
        // Nothing yet?
        if(Object.keys(this.targetData).length === 0){
            for (const player of players) {
                const dist = Math.hypot(player.x - this.x, player.y - this.y);
                if (dist < minDist) {
                    minDist = dist;
                    this.targetData = { key: player.id, targetType: "player" };
                }
            }
        }
        // Nothing yet?
        if (Object.keys(this.targetData).length === 0 && this.inventory.some(item => item.name === "Hand")) {
            for (const item of Object.values(world.pickables)) {
                const dist = Math.hypot(item.x - this.x, item.y - this.y);
                if (dist < minDist && item.class !== "Coin") {
                    minDist = dist;
                    this.targetData = { key: item.id, targetType: "pickable" };
                }
            }
        }

        if (this.targetData.key) {
            let original
            if(this.targetData.targetType === "player"){
                original = world.entities[this.targetData.key]
                
            } else{
                original = world.pickables[this.targetData.key]
            }
            this.target = (({ x, y, id, width, height }) => ({ x, y, id, width, height }))(original)
            this.targetType = this.targetData.targetType;
        } else {
            this.target = null;
        }
    }

    damageCoolDown() {
        if (this.justAttacked) {
            this.cooldownTime++;
            if (this.cooldownTime * this.cooldownSF >= this.cooldownDuration) {
                this.cooldownTime = 0;
                this.justAttacked = false;
            }
            // MELEE ATTACK ONLY
            if(this.status[0].slice(0,7) == "Hitting"){
                this.freeze = true
                setTimeout(()=>{this.freeze = false}, 250)
            }
        }
    }

    move() {
        const world = worlds[this.worldID];

        this.findTarget();
        this.damageCoolDown();
        this.dx = this.dy = 0;
        let distanceToTarget = this.target ? Math.hypot(this.target.x - this.x, this.target.y - this.y) : Infinity;

        if (distanceToTarget <= this.detectRange) {
            this.giveStatus("Attacking")
            this.dx = this.target.x - this.x;
            this.dy = this.target.y - this.y;
            this.moving = true;
        } else if (!this.moving) {
            this.setRandomTarget(world);
        } else {
            this.dx = this.targetX - this.x;
            this.dy = this.targetY - this.y;
            if (Math.abs(this.dx) < this.width && Math.abs(this.dy) < this.height) {
                this.setRandomTarget(world);
            }
        }

        this.moveMove();
        this.handleInteraction(world, distanceToTarget);
    }

    setRandomTarget(world) {
        const mp = world.mapSize;
        this.targetX = random(mp / 2, -mp / 2);
        this.targetY = random(mp / 2, -mp / 2);
        this.moving = true;
        setTimeout(() => (this.moving = false), 10000);
    }

    handleInteraction(world, distanceToTarget) {
        if (this.target 
        && distanceToTarget < 
        (Math.max(this.width, this.height)/2) * 0.8 
        + (Math.max(this.target.width, this.target.height)/2) * 0.8){//ATTACK!!
            if (this.targetType === "player" && !this.justAttacked) {
                let player = world.entities[this.target.id];
                let damage = this.damage;
                const tool = this.inventory[this.invSelected];
                if (tool.class === "Sword") {
                    // USE SWORD/TOOL
                    damage += tool.damage;
                    tool.durability--;
                    if (tool.durability <= 0) {
                        this.inventory[this.invSelected] = { ...holdableItems["Hand"] };
                    }
                }
                //get status
                this.giveStatus("Hitting")//normal hitting!

                // ELIGIBLE! DEAL DAMAGE!
                dealDamageTo(damage, this, player, null, this.worldID);
                this.justAttacked = true;
            } 
            // PICK IT UP!!            
            else if (this.targetType === "pickable") {
                var item = world.pickables[this.target.id];
                for (let slot in this.inventory) {
                    if (this.inventory[slot].name === "Hand") {
                        this.inventory[slot] = { ...holdableItems[item.itemName], stackSize: item.stackSize, durability: item.durability };
                        delete world.pickables[item.id];
                        break;
                    }
                }
            }
        }
    }

    moveMove() {
        const world = worlds[this.worldID];

        if (this.status.some(s => loadingStatuses.includes(s))) {
            this.speed = this.maxSpeed * percentSpeedReduction; // 40% speed while loading
        } else {
            this.speed = this.maxSpeed;
        }
        if(!this.freeze){ 
            this.dist = Math.hypot(this.dx, this.dy);
            if (this.dist > 0) {
                this.dx /= this.dist;
                this.dy /= this.dist;
            }

            this.xInc = this.dx * this.speed;
            this.yInc = this.dy * this.speed;

            if (this.knockbackDue.x !== 0) {
                this.xInc -= this.knockbackDue.x;
                this.knockbackDue.x = 0;
            }
            if (this.knockbackDue.y !== 0) {
                this.yInc -= this.knockbackDue.y;
                this.knockbackDue.y = 0;
            }
            
            if (this.x + this.xInc > world.BORDERS.R || this.x + this.xInc < world.BORDERS.L) {
                this.xInc = 0;
            }
            if (this.y + this.yInc > world.BORDERS.U || this.y + this.yInc < world.BORDERS.D) {
                this.yInc = 0;
            }

            this.onWall = getOnWallStatus(world.obstacles, this);

            const newCoords = checkCollision(
                this.id, world.obstacles, world.lakes, this.x, this.y, this.xInc, this.yInc, this.onWall, this,
                true, this.width, this.height, this.worldID, world.entities
            );

            if (newCoords.addLakeParticle) {
                createParticle(world, this.x, this.y, this.id);
            }

            this.x += newCoords.tx;
            this.y += newCoords.ty;
            this.rotation = Math.atan2(this.dy, this.dx) + this.defaultRotation;
        } 

        
    }
}
class Boss extends Enemy{
    constructor(x=0, y=0){
        super("Boss", true, x, y, bossID)
        this.summonGuards = false
    }
    move(){
        if(this.health < this.maxHealth * 3/4){
            if(!this.summonGuards) this.summonInGuards()
        } 
        super.move()

        let world = worlds[this.worldID]
        if(this.health == this.maxHealth){
            for(let e in world.entities){
                // if health regenerates, remove summoned lords
                if (world.entities[e].type=="Summoned Lord"){
                    delete world.entities[e]
                    this.summonGuards = false
                }
            }
        } else if (this.health < this.maxHealth){
            //regenerate!! >:)
            this.health += 0.01 //* speedFactor
        }
    }
    summonInGuards(guardCount = 8, spread = 500){
        //manual summon
        if(!this.summonGuards){
            this.summonGuards = true
            summon("Summoned Lord", this.x, this.y, spread, guardCount, this.worldID)
        }
    }
}
class Archer extends Enemy {
    constructor(x, y, id, worldID) {
        let data = structuredClone(enemyObj["Archer"]);
        super("Archer", false, x, y, id, worldID, data.inventory, data.invSelected);
        this.shootRange = data.shootRange;
        this.holdDuration = 0;
        this.holdNum = 0;
        this.safeDistance = this.shootRange / 2;
        this.isPaused = false;
        this.fleeingFar = false; // NEW: track if archer is fleeing far
        this.fleeTarget = null;  // NEW: where to flee to
    }

    move() {
        let world = worlds[this.worldID];

        if (this.inventory[this.invSelected].name == "Bow") {
            super.findTarget();
            super.damageCoolDown();

            this.dx = this.dy = this.dist = 0;
            let distanceToTarget = this.target
                ? Math.sqrt((this.target.x - this.x) ** 2 + (this.target.y - this.y) ** 2)
                : 10 ** 10;

            // If target is too close, flee far away and KEEP loading bow
            if (distanceToTarget < this.safeDistance) {
                // If not already fleeing far, pick a random far-away point
                if (!this.fleeingFar) {
                    let mp = world.mapSize;
                    // Pick a point at least shootRange away from target
                    let angle = Math.atan2(this.y - this.target.y, this.x - this.target.x);
                    let dist = this.shootRange * 2 + random(200, 0);
                    this.fleeTarget = {
                        x: this.x + Math.cos(angle) * dist,
                        y: this.y + Math.sin(angle) * dist
                    };
                    // Clamp to borders
                    this.fleeTarget.x = Math.max(world.BORDERS.L + 50, Math.min(world.BORDERS.R - 50, this.fleeTarget.x));
                    this.fleeTarget.y = Math.max(world.BORDERS.D + 50, Math.min(world.BORDERS.U - 50, this.fleeTarget.y));
                    this.fleeingFar = true;
                }
                // Move toward fleeTarget
                this.dx = this.fleeTarget.x - this.x;
                this.dy = this.fleeTarget.y - this.y;
                this.speed = this.maxSpeed;
                // --- DO NOT reset holdNum/holdDuration while fleeing ---
                // this.holdNum = 0;
                // this.holdDuration = 0;
                // Instead, keep loading bow as normal:
                this.holdNum += 1;
                this.holdDuration = Math.min(5, Math.floor(this.holdNum / (30 * this.cooldownSF)) + 1);
                this.inventory[this.invSelected].imgSrc = `/imgs/Bow${this.holdDuration}.png`;
                // If reached fleeTarget, stop fleeing
                if (Math.abs(this.dx) < 10 && Math.abs(this.dy) < 10) {
                    this.fleeingFar = false;
                }
                super.moveMove();
            }
            // If at a safe distance, load and shoot
            else if (distanceToTarget <= this.detectRange) {
                this.fleeingFar = false;
                this.giveStatus("Attacking");
                this.dx = this.target.x - this.x;
                this.dy = this.target.y - this.y;
                this.rotation = Math.atan2(this.dy, this.dx) + this.defaultRotation;

                if (distanceToTarget > this.shootRange) {
                    // Get closer to shoot
                    this.speed = this.maxSpeed;
                    this.holdNum += 1;
                    this.holdDuration = Math.min(5, Math.floor(this.holdNum / (30 * this.cooldownSF)) + 1);
                    this.inventory[this.invSelected].imgSrc = `/imgs/Bow${this.holdDuration}.png`;
                    super.moveMove();
                } else {
                    // Stop and attack when at a safe distance
                    this.speed = 0;
                    this.holdNum += 1;
                    this.holdDuration = Math.min(5, Math.floor(this.holdNum / (30 * this.cooldownSF)) + 1);
                    this.inventory[this.invSelected].imgSrc = `/imgs/Bow${this.holdDuration}.png`;

                    if (this.holdDuration === 5 && !this.justAttacked) {
                        this.shootArrow(this.holdDuration);
                        this.holdNum = 0;
                    }
                }
            } else {
                // Wander if target is out of range
                this.fleeingFar = false;
                this.speed = this.maxSpeed;
                if (!this.moving) {
                    let mp = world.mapSize;
                    this.targetX = random(mp / 2, -mp / 2);
                    this.targetY = random(mp / 2, -mp / 2);
                    this.dx = this.targetX - this.x;
                    this.dy = this.targetY - this.y;
                    this.moving = true;
                    setTimeout(() => {
                        this.moving = false;
                    }, 10000);
                } else {
                    this.dx = this.targetX - this.x;
                    this.dy = this.targetY - this.y;
                    if (Math.abs(this.dx) < 1 && Math.abs(this.dy) < 1) {
                        let mp = world.mapSize;
                        this.targetX = random(mp / 2, -mp / 2);
                        this.targetY = random(mp / 2, -mp / 2);
                    }
                }
                super.moveMove();
            }
        } else {
            // Default movement when not holding a bow
            this.speed = this.maxSpeed;
            super.move();
        }
    }

    shootArrow(holdDuration) {
        if(this.isDead || this.justAttacked) return null
        this.justAttacked = true; // You just attacked
        const arrowOffsetMaxDeg = 10; // Maximum offset angle in degrees
        const arrowDirection =
            this.rotation +
            this.defaultRotation +
            Math.PI +
            (random(1, -1) * (random(arrowOffsetMaxDeg, 0) * (Math.PI / 180))); // Offset shot direction
        this.giveStatus("Shooting")
        // Shoot the arrow
        createArrow(this, arrowDirection, holdDuration, this.worldID);
        // update bow phase
        this.inventory[this.invSelected].imgSrc = "/imgs/Bow.png";

        // Reduce bow durability
        this.inventory[this.invSelected].durability -= 1;

        // Break bow if durability is 0
        if (this.inventory[this.invSelected].durability <= 0) {
            this.inventory[this.invSelected] = { ...holdableItems["Hand"] };
        }
    }
}
function summon(enemyKey, x, y, spread, amount, worldID, frequency=10){
    let enemy = enemyObj[enemyKey]
    let i = 0
    let abcInterval = setInterval(()=>{
        let coords = findSpawnAround(x, y, Math.max(enemy.w, enemy.h), spread, worldID)
        let xx = coords.x
        let yy = coords.y
        if(xx && yy) {
            let id = createID()
            worlds[worldID].entities[id] = new Enemy(enemyKey, true, xx, yy, id, worldID)
            i ++
        }
        //give up if more than 100 tries or if the requested amount is satisfied
        if(i == amount || i > 100) clearInterval(abcInterval)
    }, frequency)
}

/*************************** @ENEMY_GENERATOR *************/
// nested objects, so enemyObj are deep copies `structuredClone()`
//const maxEnemyCount = Math.floor(Math.sqrt(mp**2/400**2)) //1 per 400 sq px
const enemyObj = {
    "Normal":{
        type:"Normal",
        imgSrc:entityImgSrcs["Normal Enemy"],
        damage: 5,
        detectRange: 400,
        reloadTime: 25,
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
        knockbackDist:5,
        knockbackResistance:0,
    },
    "Lord":{
        type:"Lord",
        imgSrc:entityImgSrcs["Lord"],
        damage: 40,
        detectRange: 750,
        reloadTime: 50,
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
        knockbackDist:10,
        knockbackResistance:60,
    },
    "Archer":{
        type:"Archer", 
        imgSrc:entityImgSrcs["Archer"], 
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
        generationProbability:50, //out of 100
        deathMessages:["An archer shot you.", "A monster shot you with an arrow.", "You were killed by an archer's arrow."],
        knockbackDist:5,
        knockbackResistance:0,
    },

    "Summoned Lord":{
        type:"Summoned Lord", 
        imgSrc:entityImgSrcs["Summoned Lord"], 
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
        knockbackDist:10,
        knockbackResistance:80,
    },
    "Boss":{
        type:"Boss", 
        imgSrc:entityImgSrcs["Boss"], 
        damage:250, 
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
        knockbackDist:20,
        knockbackResistance:80,
    },

    // Normal --> Small --> Tiny
    "Vantacite Monster":{
        type:"Vantacite Monster", 
        imgSrc:entityImgSrcs["Vantacite Monster"], 
        damage:95, 
        detectRange:500, 
        reloadTime:100, 
        speed:3, 
        health:750, 
        w:entitySize*2.25, 
        h:entitySize*2.25,
        lootTable : [ //when selected generationProb
            {...holdableItems["Vantacite Sword"], generationProbability:20},
            {...holdableItems["Iron Sword"], generationProbability:100},
            {...holdableItems["Gold Sword"], generationProbability:80},
            {...holdableItems["Diamond Sword"], generationProbability:60},
            {...holdableItems["Plasma Sword"], generationProbability:10},
            {...holdableItems["Spear"], generationProbability:50},
        ], 
        giveXP : 2000,
        generationProbability:10,//100
        deathMessages:["You died from a vantacite monster.", "A vantacite monster squashed you.", "You saw a vantacite monster."],
        knockbackDist:50,
        knockbackResistance:80,
    },
    "Small Vantacite Monster":{
        type:"Small Vantacite Monster", 
        imgSrc:entityImgSrcs["Vantacite Monster"], 
        damage:40, 
        detectRange:500, 
        reloadTime:50, 
        speed:4, 
        health:400, 
        w:entitySize*3/2, 
        h:entitySize*3/2,
        lootTable : [ //when selected generationProb
            {...holdableItems["Vantacite Sword"], generationProbability:20},
            {...holdableItems["Iron Sword"], generationProbability:100},
            {...holdableItems["Gold Sword"], generationProbability:40},
            {...holdableItems["Diamond Sword"], generationProbability:30},
            {...holdableItems["Plasma Sword"], generationProbability:5},
            {...holdableItems["Spear"], generationProbability:25},
        ], 
        giveXP : 1000,
        generationProbability:20,
        deathMessages:["You died from a mini vantacite monster.", "A small vantacite monster hit you.", "You saw a vantacite monster (a small one)."],
        knockbackDist:7.5,
        knockbackResistance:60,
    },
    "Tiny Vantacite Monster":{
        type:"Tiny Vantacite Monster", 
        imgSrc:entityImgSrcs["Vantacite Monster"], 
        damage:20, 
        detectRange:500, 
        reloadTime:30, 
        speed:4.5, 
        health:250, 
        w:entitySize, 
        h:entitySize,
        lootTable : [ //when selected generationProb
            {...holdableItems["Vantacite Sword"], generationProbability:20},
            {...holdableItems["Iron Sword"], generationProbability:50},
            {...holdableItems["Gold Sword"], generationProbability:40},
            {...holdableItems["Diamond Sword"], generationProbability:30},
            {...holdableItems["Plasma Sword"], generationProbability:5},
            {...holdableItems["Spear"], generationProbability:20},
        ], 
        giveXP : 500,
        generationProbability:0, //spawns in special occasions
        deathMessages:["You died from a tiny vantacite monster.", "A tiny vantacite monster hit you.", "You saw a vantacite monster (a tiny one)."],
        knockbackDist:5,
        knockbackResistance:30,
    },
    "Very Tiny Vantacite Monster":{
        type:"Very Tiny Vantacite Monster", 
        imgSrc:entityImgSrcs["Vantacite Monster"], 
        damage:5, 
        detectRange:500, 
        reloadTime:5, 
        speed:7, 
        health:50, 
        w:entitySize * 0.7, 
        h:entitySize * 0.7,
        lootTable : [ //when selected generationProb
            {...holdableItems["Vantacite Sword"], generationProbability:10},
            {...holdableItems["Iron Sword"], generationProbability:70},
            {...holdableItems["Gold Sword"], generationProbability:40},
            {...holdableItems["Diamond Sword"], generationProbability:30},
            {...holdableItems["Plasma Sword"], generationProbability:5},
            {...holdableItems["Spear"], generationProbability:20},
        ], 
        giveXP : 250,
        generationProbability:0, //spawns in special occasions
        deathMessages:["You died from a very small vantacite monster.", "A very small vantacite monster hit you.", "You saw a vantacite monster (a very small one)."],
        knockbackDist:1,
        knockbackResistance:0,
    }
}
var bossID = "Boss"

/**************************** @PROJECTILES *************/
const projectilesObj = {
    "Arrow":{
        name:"Arrow",
        damage:holdableItems["Arrow"].damage,
        flightDuration:10,
        imgSrc:"/imgs/Arrow.png",
        speed:10,
        knockbackPercent:50,
    },
    "Spear":{
        name:"Spear",
        damage:holdableItems["Spear"].damage,
        flightDuration:50,
        imgSrc:"/imgs/Spear.png", 
        speed:20,
        knockbackPercent:300,
    }
}
class Projectile{
    constructor(worldID, id, name, x, y, w, h, dir, whoShot, durability, speed=null, duration=null, damage=null){
        this.worldID = worldID
        this.id = createRandomString(10)
        this.name = name //key inside holdable items!
        this.x = x
        this.y = y
        this.knockbackDue = {x:0, y:0}
        this.knockbackDist = 5
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
    let id = createRandomString(10, true)
    world.projectiles[id] = new Projectile(
        worldID, 
        id,
        "Arrow", 
        entity.x + Math.cos(arrowDirection) * entity.width/2, 
        entity.y + Math.sin(arrowDirection) * entity.height/2, 
        50, 50, arrowDirection, entity, holdableItems["Arrow"].durability,
        projectilesObj["Arrow"].speed + 2.5 * (holdDuration-1), //ZOOM
        projectilesObj["Arrow"].flightDuration + 10 * (holdDuration-1), //wee! 
        projectilesObj["Arrow"].damage + 5 * (holdDuration-1), //that's gotta hurt
    )
}

/******** DAMAGE ********/
function dealDamageTo(damage, from, to, projectileKey=null, worldID="Main"){
    if(from == to) return
    if(!to) return
    let world = worlds[worldID]

    //deal initial damage...first...are they immune
    if(to.immuneDuration <= 0) { 
        to.health -= damage 
    } 

    //bosses have an exception...
    else if(to.type !== "Boss") { to.immuneDuration -= damage * 10 } //deal damage to immunity instead 
    
    // dead...?
    if(to.health <= 0){
        console.log("Killing entity", to.id, "in world", worldID)
        KillEntity(to.id, worldID, from, projectileKey) // mark as dead
    }
    //guess not! Knockback!!
    else{
        var hitFromDirection = Math.atan2(to.y-from.y, to.x-from.x)
        var goToDirection = hitFromDirection + Math.PI
        // apply KNOCKBACK
        var toolHeldKnockback
        // is it a projectile?
        if(projectileKey && world.projectiles[projectileKey]){
            // what kind?
            let typeOfProjectile = world.projectiles[projectileKey].name
            // get knockback amount
            toolHeldKnockback = projectilesObj[typeOfProjectile].knockbackPercent
        }
        //no it's not...
        else if(from.inventory){
            //use tool knockback
            if(DEBUG) console.log("From:", from)
            toolHeldKnockback = from.inventory[from.invSelected].knockback
        }

        // calculate total knockback
        var kbd = (from.knockbackDist) * (1-to.knockbackResistance) * (1+(toolHeldKnockback/100))

        // apply knockback
        worlds[worldID].entities[to.id].knockbackDue.x = kbd * Math.cos(goToDirection)
        worlds[worldID].entities[to.id].knockbackDue.y = kbd * Math.sin(goToDirection)

        // if your a bot, you have a grudge now...
        if (to.kindOfEntity == "Bot"){
            //if it's a projectile, target the owner, else the source.
            let newGrudgeID = projectileKey?from.whoShot.id:from.id
            if(!to.grudges[newGrudgeID] && newGrudgeID !== to.id) {
                to.grudges[newGrudgeID] = newGrudgeID
            }
        }
    }

    // emit particle to players in this world
    if (from && to && from.id !== to.id && damage > 0 && typeof io !== "undefined") {
        // Broadcast to all players in the same world
        for (const entityId in worlds[worldID].entities) {
            const entity = worlds[worldID].entities[entityId];
            if (entity.isPlayer 
            && entity.socketId 
            && io.sockets.sockets.has(entity.socketId)) {
                io.to(entity.socketId).emit("showDamage", {
                    x: to.x,
                    y: to.y,
                    value: Math.round(damage),
                    color: "#ff4444"
                });
            }
        }
    }
}
/****** CREATE WORLDS *******/
function createWorld(
    id, 
    mp=defaultMapSize, numEnemies=null, numTrees=null, numLakes=null, numStructures=null, numPickables=null, numMarkets=null){
    
    let amountOfEnemies = numEnemies?numEnemies:Math.floor(mp/400)
    let amountOfTrees = numTrees?numTrees:Math.floor(mp/75)
    let amountOfLakes = numLakes?numLakes:Math.floor(mp/1000)
    let amountOfStructures = numStructures?numStructures:Math.floor(mp/400)
    let amountOfPickables = numPickables?numPickables:Math.floor(mp/40)
    let amountOfMarkets = numMarkets?numMarkets:Math.floor(mp/1200)

    worlds[id] = new World(id, mp, amountOfEnemies, amountOfTrees, amountOfLakes, amountOfStructures, amountOfPickables, amountOfMarkets)

    if(DEBUG) console.log(worlds[id])

    // For structures
    //var allStairs = []

    /** MAIN STRUCTURE */
    if(id==="Main"){
        /** @MAIN_STRUCTURE */
        /**Key:
         * S = Stairs
         * W = Wall
         * N = Space
         * E = Escape (Comes later after boss defeated)
         */
        for(let r = 0; r < mainStructureW; r++){
            for(let c = 0; c < mainStructureH; c++){
                let wall = {
                    relX: r*wallSize-(mainStructureW * wallSize)/2 + mainStructureCenter.x,
                    relY: c*wallSize-(mainStructureH * wallSize)/2 + mainStructureCenter.y
                }
                let sID = createRandomString(20)
                if(mainStructureBlueprint[r][c] == "W"){
                    worlds[id].structures[`STRUCTURE${sID}`] = new Wall(wall, sID, wallSize, id)
                } else if(mainStructureBlueprint[r][c] == "S"){
                    // for some reason, column first? (??)

                    // Likely because the blueprint is made manually
                    // and the columns are read differently in 
                    // this function findStairRotation.
                    let stairRotation = findStairRotation(c, r, mainStructureBlueprint)
                    if(DEBUG) console.log(stairRotation)
                    if(stairRotation != -1){
                        worlds[id].structures[sID] = new Stairs(wall.relX, wall.relY, sID, wallSize, stairRotation, id) 
                    } else{
                        worlds[id].structures[`STRUCTURE${sID}`] = new Wall(wall, sID, wallSize, id)
                    }

                    //allStairs.push({r:r,c:c,id:sID, blueprint:mainStructureBlueprint})
                } else if(mainStructureBlueprint[r][c] == "E"){
                    worlds[id].escapesData.push({x:wall.relX,y:wall.relY,r:r,c:c,blueprint:mainStructureBlueprint})
                }
            }
        }

    }

    /** LAKES */
    if(DEBUG) console.log("Lakes")
    var mp = worlds[id].mapSize
    for(let i = 0; i < amountOfLakes; i++){
        let size = random(300,250)
        worlds[id].lakes[`LAKE${i}`] = new Lake(random(mp/2-size,-mp/2+size), random(mp/2-size,-mp/2+size), size)
    }

    /** STRUCTURES */
    if(DEBUG) console.log("Structures")
    for(let i = 0; i < amountOfStructures; i++){
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
                let possibleWalls = ["W", "W", "W", "W", "W", "N", "N", "N", "N", "S"] //1 "S" in 10 tries
                blueprint[r].push(possibleWalls[random(possibleWalls.length-1, 0)])
            }
        }
        let structureSize = blueprintSize * wallSize

        let a = findSpawn(structureSize, id)
        if(a.x && a.y){
            //generate Structure
            for(let r = 0; r < blueprintSize; r++){
                for(let c = 0; c < blueprintSize; c++){
                    let nC = { 
                        relX: a.x + c*wallSize, 
                        relY: a.y + r*wallSize 
                    }
                    let sID = `STRUCTURE${createRandomString(20)}`
                    if(blueprint[r][c] == "W"){
                        worlds[id].structures[sID] = new Wall(nC, sID, wallSize, id)
                    } else if(blueprint[r][c] == "S"){
                        //allStairs.push({r:r,c:c,id:sID, blueprint:blueprint})

                        let stairRotation = findStairRotation(r, c, blueprint)
                        if(DEBUG) console.log(stairRotation)
                        if(stairRotation != -1){
                            worlds[id].structures[sID] = new Stairs(nC.relX, nC.relY, sID, wallSize, stairRotation, id) //rotate none as a placeholder
                        } else { 
                            worlds[id].structures[sID] = new Wall(nC, sID, wallSize, id)
                        }
                    }
                }
            }
        } else console.log(id, "Abandon generation --> structure")
    }

    /** MARKETS */
    if(DEBUG) console.log("Markets")
    for(let i = 0; i < amountOfMarkets; i++){
        let mid = createRandomString(20)
        let coords = findSpawn(marketSize, id)
        if(coords.x && coords.y) {
            worlds[id].markets[mid] = new Market(id, coords.x, coords.y, mid)
        } else console.log(id, "Abandon generation --> market")
    }

    /** TREES */
    if(DEBUG) console.log("Trees")
    for(let i = 0; i < amountOfTrees; i++){
        let tID = createRandomString(20)
        let newTree = new Tree(id, tID)
        //console.log(newTree)
        //if the tree can be generated, add to pool
        if(newTree.x && newTree.y) worlds[id].trees[`Tree${tID}`] = newTree
    }
    
    // ASSIGN OBSTACLES TO WORLD DATA
    worlds[id].obstacles = Object.assign({}, worlds[id].structures, worlds[id].trees)

    if(DEBUG) console.log("Done")
}

// CREATE MAIN WORLD
createWorld("Main")
//INITIALIZE BOSS
toggleOpeningsToArena(true, "Main")
worlds["Main"].entities[bossID] = new Boss()

// CREATE SAMPLE WORLD
createWorld("World1", 1500, 0, 10, 1, 2, 0, 1)

/*************************** @SERVER_GAME_LOOOOOP *************/
var startedCountdown = false
var bossCountDownTime = 0; //BOSS COUNTDOWN TIMER ... already spawned in?
var bossCountDownTimeMax = 120 //s
const FPS = 20 //
const ACTIVE_RADIUS = 1500; // Only process entities within this distance of any player
setInterval(()=>{
    for(let worldID in worlds){
        let world = worlds[worldID]
        //spawn in boss?
        if(worldID == "Main"){
            if (!world.entities[bossID] && !startedCountdown){
                toggleOpeningsToArena(false, "Main");
                startedCountdown = true
                bossCountDownTime = bossCountDownTimeMax; // seconds  
                let countdownInterval = setInterval(() => {
                    bossCountDownTime--;
            
                    if (bossCountDownTime === 0) {
                        clearInterval(countdownInterval); // Stop the countdown interval
                        toggleOpeningsToArena(true, "Main")
                        world.entities[bossID] = new Boss()
                        startedCountdown = false
                        console.log("The boss has entered the arena.");
                    }
                }, 1000);
            }
        }
        //Spawn in entities (chance of)
        if(Object.keys(world.entities).length < world.amountOfEnemies){
            var randomKey = Object.keys(enemyObj)[random(Object.keys(enemyObj).length-1, 0)]
            if(random(100, 1) < enemyObj[randomKey].generationProbability){
                var nC = findSpawn(entitySize, worldID)
                if(nC.x && nC.y){
                    let id = createID()
                    if(randomKey === "Archer"){
                        world.entities[id] = new Archer(nC.x, nC.y, id, worldID)
                    } else{
                        world.entities[id] = new Enemy(randomKey, false, nC.x, nC.y, id, worldID)
                    }
                } else console.log(worldID, "Abandon generation --> mob")
            }
        }
        //the boss has no immune!...
        if(world.entities[bossID]) world.entities[bossID].immuneDuration = 0
        //Move and update entities' health        

        function isNearAnyPlayer(entity, world) {
            for (let id in world.entities) {
                let player = world.entities[id];
                if (player.isPlayer) {
                    let dx = player.x - entity.x;
                    let dy = player.y - entity.y;
                    if (dx*dx + dy*dy < ACTIVE_RADIUS*ACTIVE_RADIUS) return true;
                }
            }
            return false;
        }

        // When looping through entities:
        for (let e in world.entities) {
            let entity = world.entities[e];
            if(isNearAnyPlayer(entity, world)){
                if (!entity.isPlayer) {
                    // Skip entities that are not players and not near any player
                    
                    if(worldID == "Main" && world.entities[e].type == "Summoned Lord"){
                        world.entities[bossID].immuneDuration = MAX_IMMUNE_DURATION
                    }
                    world.entities[e].move()
                    /*
                    if(world.entities[e].health <= 0) {
                        KillEntity(world.entities[e], worldID) // mark as dead
                    }*/
                }
                else{
                    if(entity.health < entity.maxHealth){
                        world.entities[e].health += 0.01
                
                    }/*
                    if(entity.health <= 0){
                        entity.isDead = true // This player is NOW dead!!
                        Object.values(world.entities[e]).filter(i => !i.isDead)
                    }*/
                    if(entity.immuneDuration > 0){
                        world.entities[e].immuneDuration -= 1 
                    }
                }
            }
        }

        //add coins
        if(random(500,1)==1 && Object.keys(world.pickables).length < world.amountOfPickables){ //50=max amount of eatables at one time
            let spawnLocation = findSpawn(pickableSize, worldID) //find a suitable place to generate
            if(spawnLocation.x && spawnLocation.y){
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
            } else if (DEBUG) console.log(worldID, "Abandon generation --> eatable")
        }
        
        //add loot 0.1% chance (swords, etc.)
        if (random(1000, 1) == 1) {
            let spawnLocation = findSpawn(pickableSize, worldID)
            if(spawnLocation.x && spawnLocation.y){
                let randomKey = Object.keys(holdableItems)[Math.floor(Math.random() * Object.keys(holdableItems).length)] // rand key in holdableItems
                if (random(100, 1) < holdableItems[randomKey].generationProbability) {
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
            } else console.log(worldID, "Abandon generation --> loot")
        }
        //update world.pickables (despawn?)
        const pickablesToDelete = [];
        const pickableArr = Object.values(world.pickables);
        for (let i = 0; i < pickableArr.length; i++) {
            let pickable = pickableArr[i];
            pickable.despawnIn -= 1;
            if (pickable.despawnIn <= 0) {
                pickablesToDelete.push(pickable.id);
            }
        }
        for (let i = 0; i < pickablesToDelete.length; i++) {
            delete world.pickables[pickablesToDelete[i]];
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

            borderInPoints(projectile.x, projectile.y, projectile.worldID)

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
            let collision = checkCollision(projectile.id, world.obstacles, world.lakes, projectile.x, projectile.y, projectile.speed * Math.cos(projectile.direction), projectile.speed * Math.sin(projectile.direction), projectile.whoShot.onWall, projectile, false, projectile.width, projectile.height, projectile.worldID);
            
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

            // Damage entities and entities
            let obj = world.entities
            for (let k in obj) {
                let entity = obj[k];

                // CANNOT BE SHOT BY YOUR OWN PROJECTILE!
                if(entity == projectile.whoShot) continue

                // Check if projectile hits entity
                if (projectile.x > entity.x - entity.width / 2 &&
                    projectile.x < entity.x + entity.width / 2 &&
                    projectile.y > entity.y - entity.height / 2 &&
                    projectile.y < entity.y + entity.height / 2) {
                    // Decrease entity health by projectile damage
                    dealDamageTo(projectile.damage, projectile, entity, key, projectile.worldID)
                    
                    // Only drop if it's a thrown spear (not arrows, not infinite durability)
                if (
                    projectile.name === "Spear" &&
                    projectile.durability !== Infinity &&
                    projectile.durability > 0
                ) {
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
        } 
    }
}, 1000/FPS)

var intervals = {}

/*************************** @SOCKET *************/
//what to do when a player connects

// * * * SOCKET * * * //
import { Server as SocketIOServer } from 'socket.io';
import { setInterval } from "timers";

// Assuming `serv` is your HTTP server instance:
const io = new SocketIOServer(serv, {});

io.sockets.on("connection", (socket)=>{
    console.log("New Socket Connection")

    var global_player //global var of player, when defined
    let bowHoldData = {};    // { [playerId]: { holdStart: timestamp, invSelected: number } }
    let spearHoldData = {};  // { [playerId]: { holdStart: timestamp, invSelected: number } }

    socket.emit("allowUpdate") // allow to start
    
    //
    socket.on("askForStartData", function(data){
        //creating world?
        if(data.createWorldData.wantToCreateWorld){
            //just makin sure... 0.0000...1% change of this code running
            //just to be safe...
            if(data.worldID in worlds) {
                data.worldID = createRandomString(6)
            }
            //add world    
            createWorld(
                data.worldID, 
                data.worldSize, 
                data.botCount,
                null,
                data.lakeCount,
                data.structureCount,
                null,
                data.marketCount
            )
            if(DEBUG) console.log("World ID --> ", data.worldID)
        }

        //huh...
        if(!data.createWorldData.wantToCreateWorld 
        && !(data.worldID in worlds)){
            //invalid worldID, return...nothing happened here
            socket.emit("noWorld")
            return //go home
        }

        let nC = findSpawn(entitySize, data.worldID)
        let player = new Player(nC.x, nC.y, data.username, entityImgSrcs[data.img], data.worldID)
        player.socketId = socket.id //assign socket id to player

        // Remove any old player with this socketId
        for (let eid in worlds[data.worldID].entities) {
            let ent = worlds[data.worldID].entities[eid];
            if (ent.socketId === socket.id) {
                delete worlds[data.worldID].entities[eid];
            }
        }

        // Add new player to pool
        worlds[data.worldID].entities[player.id] = player;
        // ...rest of your code...
        if(data.worldID in worlds){
            var world = worlds[data.worldID]
            let entities = world.entities //identify entities
            entities[player.id] = player //add player to pool
            socket.emit("sendStartData", {
                bordersObj: world.BORDERS,
                structuresObj: world.structures, //send for map
                player:player,
                mapSize:world.mapSize,
                entitySize:entitySize,
                walls: Object.values(world.structures), //send for map
                lakes: Object.values(world.lakes), //send for map
                markets: Object.values(world.markets), //send for map
                holdables: holdableItems,
                //speedFactor: speedFactor, //how much one is affected by a speed boost (sprint)
                maxImmuneDuration:MAX_IMMUNE_DURATION, //maximum immune time
                allImgs:allImgs, // all images send to load
            })
            console.log("Player ", player.username, player.id, "joined ", data.worldID, " world")
        } else console.log("NO world existing...", data.worldID)
    }) 
    
    //update player (all vital info)
    socket.on("updatePlayer", (data)=>{
        if(data.player && data.worldID && data.worldID in worlds){
            let player = data.player
            let world = worlds[data.worldID]
            if(world.entities[player.id]) {
                let entity = world.entities[player.id];
                //what is updated, the rest is locked (remember to put in IF as well)
                let { id, x, y, rotation, invSelected, speed, onWall, inventory } = player

                Object.assign(entity, { x, y, rotation, invSelected, speed, onWall });

                if (data.reorder) entity.inventory = inventory; //only update inventory if reordering...

                //update KNOCKBACK for player!
                if(data.resetX){
                    worlds[data.worldID].entities[data.id].knockbackDue.x = 0
                }
                if(data.resetY){
                    worlds[data.worldID].entities[data.id].knockbackDue.y = 0
                }
            } else if(!player.isDead){
                console.log("ID", data.id, "was added to pool")
                world.entities[data.id] = new Player(player.x, player.y, player.username, player.imgSrc, player.worldID, player.type, player.speed, player.w, player.h, player.health, data.id, player.inventory, player.xp, player.socketId)
                // automatically make this true, so if you spawn on a tree, you good
                world.entities[data.id].onWall = true
                //
                socket.emit("reupdate", {
                    bordersObj:world.BORDERS,
                    structuresObj: world.structures,
                    mapSize:world.mapSize,
                    entitySize:entitySize,
                    walls: Object.values(world.structures),
                    lakes: Object.values(world.lakes),
                    markets: Object.values(world.markets),
                    //speedFactor, speedFactor,
                    maxImmuneDuration: MAX_IMMUNE_DURATION
                }) //re updates updated game data
            }

            global_player = player
        }
    })
    /*
    // update movement
    socket.on("resetKnockbackX", (data)=>{
        
    })
    socket.on("resetKnockbackY", (data)=>{
        worlds[data.worldID].entities[data.id].knockbackDue.y = 0
    })*/

    socket.on("requestUpdateDataFromServer", (data)=>{
        try{
            let world = worlds[data.worldID]
            let entities = world.entities
            let id = data.id
            let player = entities[data.id]
            let updateContent = [world.borderRect] //always have the border

            let activeEntities = Object.values(entities).filter(player => !player.isDead) //filter out the "alive activeEntities"
            let players = Object.values(activeEntities).filter(i=>i.isPlayer)

            if(data.worldID){
                let world = worlds[data.worldID]

                let updateLi = [
                    world.lakes, world.markets, world.structures, //landmarks
                    world.particles, //um...
                    activeEntities, //entities
                    world.pickables, world.projectiles, //items
                    world.trees //um....
                ];
                updateLi.forEach(group => {
                    for (let i in group) {
                        let item = group[i]
                        let distance;
                        if (item.isCircle) {
                            distance = Math.sqrt(Math.pow(data.x - item.x, 2) + Math.pow(data.y - item.y, 2)) - item.radius;
                            if (distance <= MAX_LOAD) {
                                updateContent.push(item); 
                            }
                        } else {
                            let dx = Math.max(Math.abs(data.x - item.x) - item.width / 2, 0);
                            let dy = Math.max(Math.abs(data.y - item.y) - item.height / 2, 0);
                            if(Math.sqrt(dx * dx + dy * dy) <= MAX_LOAD) {
                                updateContent.push(item); 
                            }
                        }
                    }
                });
                /*
                //ONLY dies if send death message!!
                if(player && player.health <= 0){// player.health <= 0
                    dropAll(id, data.worldID)
                    KillEntity(player.id, data.worldID, player, null, true) //kill entity
                    console.log("KILL HIM")
                    socket.emit("gameOver")
                }*/

                //if in range
                socket.emit("sendUpdateDataToClient", {
                    updateContent: updateContent,
                    player: player,
                    entities: activeEntities,
                    serverEntityCount: Object.keys(activeEntities).length,
                    serverPlayerCount: Object.keys(players).length,
                    leaderboard: Object.values(players)
                    .sort((a, b) => b.kills - a.kills)
                    .slice(0, 5)
                    .map(player => ({ username: player.username, kills: player.kills, xp: player.xp, id: player.id })), 
                    structures:Object.values(world.structures)
                })
            }
        } catch(err){
            console.log(err)
            socket.emit("noWorld")
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
        let usedItem = false // item was used?
        if(player){
            let tool = player.inventory[player.invSelected]

            // Bow hold logic
            let hasArrows = player.inventory.some(item => item.name === "Arrow")
            if (tool.name === "Bow" && hasArrows) {
                let phase = Math.min(5, Math.max(1, Math.floor(data.holdDuration/3)));
                bowHoldData[player.id] = {
                    holdStart: bowHoldData[player.id]?.holdStart || Date.now(),
                    invSelected: player.invSelected
                };
                player.inventory[player.invSelected].imgSrc = `/imgs/Bow${phase}.png`;
                player.giveStatus(`Bow${phase}`);
            }
            // Spear hold logic
            else if (tool.name === "Spear") {
                let phase = Math.min(3, Math.max(1, Math.floor(data.holdDuration/3)));
                spearHoldData[player.id] = {
                    holdStart: spearHoldData[player.id]?.holdStart || Date.now(),
                    invSelected: player.invSelected,
                    lastPhase: phase
                };
                // Only set status, don't set imgSrc directly
                // Spear release animation: 1 -> 2 -> 3 -> normal
                let phases = [1, 2, 3];
                let phaseIndex = 0;
                function playSpearReleaseAnim() {
                    if(player.inventory[player.invSelected].name !== "Spear") return; // Stop if the item is no longer a spear
                    if (phaseIndex < phases.length) {
                        player.giveStatus(`Spear${phases[phaseIndex]}`);
                        phaseIndex++;
                        setTimeout(playSpearReleaseAnim, 500 / phases.length); // ~0.166s per frame for 0.5s total
                    } else {player.giveStatus(`Spear3`)}
                }
                playSpearReleaseAnim();
            }
            //melee attack         
            else {
                let didDamage = false
                let damage = (tool.durability === Infinity || !tool.durability)?holdableItems["Hand"].damage:holdableItems[tool.name].damage
                
                //let hitRange = (player.inventory[player.invSelected].hitRange?player.inventory[player.invSelected].hitRange:entitySize) * data.scale
                
                let mouseX = data.x
                let mouseY = data.y
                let world = worlds[data.worldID]
                let entities = Object.values(world.entities).filter(entity => !entity.isDead);
                for(let e in entities){    
                    let entity = entities[e]            
                    if(//Math.sqrt(Math.pow(entity.x - player.x, 2) + Math.pow(entity.y - player.y, 2)) < hitRange
                    //&& 
                    entity.id != id
                    && entity.x - entity.width/2 < mouseX 
                    && entity.x + entity.width/2 > mouseX
                    && entity.y - entity.height/2 < mouseY 
                    && entity.y + entity.height/2 > mouseY
                    ){
                        if(player.inventory[player.invSelected].name != "Hand"){
                            if(player.rl == "R"){
                                //righty
                                player.giveStatus("Hitting1")
                            }
                            else if(player.rl == "L"){
                                //lefty
                                player.giveStatus("Hitting2")
                            }
                        }
                        else player.giveStatus(`Hitting${random(2,1)}`)
                        dealDamageTo(damage, player, entity, null, data.worldID)
                        didDamage = true // turn to true
                    }
                }
                if(didDamage){                    
                    usedItem = true // item was used!
                    if(tool.durability != null) tool.durability -= 1 //DAMAGE Tool
                }
            }

            if(tool.class == "UseUpErs"){
                //perform actions
                //ACTIVATE FORCE SHIELD
                if(player.inventory[player.invSelected].name == "Force Shield"){
                    if(player.inventory[player.invSelected].immuneDuration + player.immuneDuration > MAX_IMMUNE_DURATION){ 
                        player.immuneDuration = MAX_IMMUNE_DURATION
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

            if (usedItem) { 
                if(player.health > 0){
                    // Set attack cooldown status
                    player.inventory[player.invSelected].cooldownTimer = player.inventory[player.invSelected].cooldownTime // add cooldown time

                    //cooldown time for players
                    let intID = createRandomString(100)
                    let oii = player.invSelected
                    intervals[intID] = setInterval(()=>{
                        player.inventory[oii].cooldownTimer -= 1
                        if (player.inventory[oii].cooldownTimer <= 0){
                            player.inventory[oii].cooldownTimer = 0
                            clearInterval(intervals[intID])
                        }
                    }, 100)
                }
            }
        }
    })
    socket.on("mouseup", function(data){
        try{
            let world = worlds[data.worldID]
            let entities = world.entities
            let player = entities[data.id]

            if(player){
                let tool = player.inventory[player.invSelected]
                // Bow release logic
                if (tool.name === "Bow" && bowHoldData[player.id] && bowHoldData[player.id].invSelected === player.invSelected) {
                    let holdTime = Math.min(Date.now() - bowHoldData[player.id].holdStart, 5000);
                    let posHoldDuration = Math.max(1, Math.round((holdTime / 1000) * 5)) // 1-5 FIVE BOW PHASES
                    // Calculate hold duration (1-5 seconds)
                    let holdDuration = posHoldDuration<5?posHoldDuration:5; 
                    let canShoot = player.inventory.some(invSlot => invSlot.name === "Arrow");
                    if (canShoot) {
                        player.inventory[player.invSelected].imgSrc = `/imgs/Bow.png`
                        let arrowDirection = player.rotation + player.defaultRotation + Math.PI;
                        createArrow(player, arrowDirection, holdDuration, player.worldID)
                        // Decrease arrow stack or remove from inventory
                        for (let slot = 0; slot < player.inventory.length; slot++) {
                            let invSlot = player.inventory[slot];
                            if (invSlot.name === "Arrow") {
                                if (invSlot.stackSize > 1) {
                                    invSlot.stackSize -= 1;
                                } else {
                                    player.inventory[slot] = { ...holdableItems["Hand"] };
                                }
                                break;
                            }
                        }
                        //damage bow
                        tool.durability -= 1
                    }
                    delete bowHoldData[player.id];
                }
                // Spear release logic
                else if (tool.name === "Spear" && spearHoldData[player.id] && spearHoldData[player.id].invSelected === player.invSelected) {
                    let holdTime = Math.min(Date.now() - spearHoldData[player.id].holdStart, 5000);
                    let posHoldDuration = Math.max(1, Math.round((holdTime / 1000) * 5)); // 1-5
                    let holdDuration = posHoldDuration < 3 ? posHoldDuration : 3;
                    let spearDirection = player.rotation + player.defaultRotation + Math.PI;
                    tool.durability -= 1;
                    

                    // Spear release animation: 3 -> 2 -> 1 -> normal
                    let phases = [3, 2, 1];
                    let phaseIndex = 0;
                    function playSpearReleaseAnim() {
                        if (phaseIndex < phases.length) {
                            console.log(phaseIndex)
                            player.giveStatus(`Spear${phases[phaseIndex]}`);
                            phaseIndex++;
                            setTimeout(playSpearReleaseAnim, 50 / phases.length);
                        } else {
                            player.giveStatus("Wandering");

                            let projectileID = createID();
                            world.projectiles[projectileID] = new Projectile(
                                data.worldID,
                                projectileID,
                                "Spear",
                                player.x + Math.cos(spearDirection) * player.size/2,
                                player.y + Math.sin(spearDirection) * player.size/2,
                                50, 50, spearDirection, player, tool.durability,
                                projectilesObj["Spear"].speed + 2.5 * (holdDuration-1),
                                projectilesObj["Spear"].flightDuration + 10 * (holdDuration-1),
                                projectilesObj["Spear"].damage + 5 * (holdDuration-1)
                            );

                            player.inventory[player.invSelected] = {...holdableItems["Hand"]};
                            delete spearHoldData[player.id];
                        }
                    }
                    playSpearReleaseAnim();                    
                }
            } 
        } catch(err){
            console.log(err)
            socket.emit("noWorld")
        }
    })
    //reset on inventory switch
    socket.on("switchInventorySlot", function(data){
        let world = worlds[data.worldID]
        let entities = world.entities
        let player = entities[data.id]
        if(player.inventory){
            if(player.inventory[data.prevSlot].name == "Bow"){
                //reset bow
                player.inventory[data.prevSlot].imgSrc = "/imgs/Bow.png"
                if(bowHoldData[player.id]){
                    delete bowHoldData[player.id]
                }
            } else if(player.inventory[data.prevSlot].name == "Spear"){
                //reset spear
                if(spearHoldData[player.id]){
                    delete spearHoldData[player.id]
                }
            }
        }
        if(player && player.status){
            player.status = ["Wandering"]
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
        world.pickables[pid] = new Pickable(pid, player.x, player.y, boughtItem, 0, boughtItem.durability)

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
            if(!(player.x > mainStructureCenter.x - (mainStructureW/2) * (wallSize * aPad)
            && player.x < mainStructureCenter.x + (mainStructureW/2) * (wallSize * aPad)
            && player.y > mainStructureCenter.y - (mainStructureH/2) * (wallSize * aPad)
            && player.y < mainStructureCenter.y + (mainStructureH/2) * (wallSize * aPad) 
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
                createParticle(world, data.x, data.y, data.id)
            }
        }
    })

    //disconnect
    socket.on('disconnect', function() {
        try{
            console.log(`${global_player.username} ${id} disconnected`)
            removeID(global_player.id) //remove ID
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
        if(
        data.worldID 
        && worlds[data.worldID] 
        && data.player 
        && data.player.id 
        && worlds[data.worldID].entities[data.player.id]){
            console.log("Deleted PLAYER left tab ", data.player.id)
            if(data.player && !data.player.isDead){
                dropAll(data.player.id, data.worldID)
            }
            delete worlds[data.worldID].entities[data.player.id]
        }
    })    
})