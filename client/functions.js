export const entitySize = 75

export const MAX_LOAD = 750 //most px a player can see 
export const MAX_IMMUNE_DURATION = 10000 //* speedFactor//
export const SWORD_ROTATION = 45/57.1
// no nested objects, so most holdableItems are shallow copies {...}
export const holdableItems = {
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
        cooldownTime: 5, //* 1/speedFactor, //ms till next use
        cooldownTimer: 0, 
        inMarket:false,
        knockback:0, //percent
    },
    "Iron Sword":{
        name:"Iron Sword", // MUST MATCH KEY!
        class:"Sword",
        imgSrc:"/imgs/Sword.png",
        durability:30,
        maxDurability:30,
        damage:25,
        generationProbability:50, //out of 100
        rotation:SWORD_ROTATION,
        stackSize:1,
        maxStackSize:1,
        cost: 2000, //market value
        hitRange: 175,
        cooldownTime: 2, //* 1/speedFactor, //mms till next use
        cooldownTimer: 0, 
        inMarket:true,
        knockback:10, //percent
    },
    "Gold Sword":{
        name:"Gold Sword", // MUST MATCH KEY!
        class:"Sword",
        imgSrc:"/imgs/Sword2.png",
        durability:20,
        maxDurability:20,
        damage:50,
        generationProbability:30, //out of 100
        rotation:SWORD_ROTATION,
        stackSize:1,
        maxStackSize:1,
        cost: 3500, //market value
        hitRange: 150,
        cooldownTime: 5 , //* 1/speedFactor, //ms till next use
        cooldownTimer: 0, 
        inMarket:true,
        knockback:5, //percent
    },
    "Diamond Sword":{
        name:"Diamond Sword", // MUST MATCH KEY!
        class:"Sword",
        imgSrc:"/imgs/Sword3.png",
        durability:60,
        maxDurability:60,
        damage:60,
        generationProbability:10, //out of 100
        rotation:SWORD_ROTATION,
        stackSize:1,
        maxStackSize:1,
        cost: 5000, //market value
        hitRange: 150,
        cooldownTime: 5, //* 1/speedFactor, //ms till next use
        cooldownTimer: 0, 
        inMarket:true,
        knockback:30, //percent
    },
    "Plasma Sword":{
        name:"Plasma Sword", // MUST MATCH KEY!
        class:"Sword",
        imgSrc:"/imgs/Sword4.png",
        durability:100,
        maxDurability:100,
        damage:90,
        generationProbability:1, //out of 100
        rotation:SWORD_ROTATION,
        stackSize:1,
        maxStackSize:1,
        cost: 10_000, //market value
        hitRange: 125,
        cooldownTime: 7, //* 1/speedFactor, //ms till next use
        cooldownTimer: 0, 
        inMarket:true,
        knockback:60, //percent
    },
    "Vantacite Sword":{
        name:"Vantacite Sword", // MUST MATCH KEY!
        class:"Sword",
        imgSrc:"/imgs/Sword5.png",
        durability:50,
        maxDurability:50,
        damage:250,
        generationProbability:0.1, // 1 in 1000
        rotation:SWORD_ROTATION, //rad
        stackSize:1,
        maxStackSize:1,
        cost: 30_000, //market value
        hitRange: 85,
        cooldownTime: 25, //* 1/speedFactor, //ms till next use
        cooldownTimer: 0, 
        inMarket:true,
        knockback:100, //percent
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
        cooldownTimer: 0, 
        inMarket:true,
        knockback:0, //percent (SEE PROJECTILES)
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
        hitRange: MAX_LOAD,
        cooldownTime: 0, //20 bc now hold down for power/damage
        cooldownTimer: 0, 
        inMarket:true,
        knockback:0, //percent
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
        hitRange: MAX_LOAD,
        cooldownTime: 0 , //* 1/speedFactor, //ms till next use
        cooldownTimer: 0, 
        inMarket:true,
        knockback:0, //percent (SEE PROJECTILES)
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
        hitRange: MAX_LOAD,
        cooldownTime: 0 , //* 1/speedFactor, //ms till next use
        cooldownTimer: 0, 
        inMarket:true,
        immuneDuration: MAX_IMMUNE_DURATION,//s
        knockback:0, //percent 
    },
    
    "Debug":{
        name:"Debug", // MUST MATCH KEY!
        class:"Sword",
        imgSrc:"/imgs/Sword5.png",
        durability:100000,
        maxDurability:100000,
        damage:1000,
        generationProbability:0, // 1 in 1000
        rotation:SWORD_ROTATION, //rad
        stackSize:1,
        maxStackSize:1,
        cost: 1_000_000_000, //market value
        hitRange: 1000,
        cooldownTime: 1 , //* 1/speedFactor, //ms till next use
        cooldownTimer: 0, 
        inMarket:false,
        knockback:0, //percent 
    },
}

export const random = (max, min) => Math.floor(Math.random() * (max - min + 1)) + min

export function getOnWallStatus(obstacles, player){
    //console.log(obstacles)
    for(let o in obstacles){
        let obstacle = obstacles[o]
        let width = player.width/2
        let height = player.height/2
        if(obstacle.class == "Stairs"
        && player.x > obstacle.x-obstacle.width/2 
        && player.x < obstacle.x+obstacle.width/2
        && player.y > obstacle.y-obstacle.height/2
        && player.y < obstacle.y+obstacle.height/2
        && !player.onWall){
            return true
        } else if(player.onWall){
            if(((obstacle.class == "Wall" || obstacle.class == "Stairs")
            && player.x > obstacle.x-obstacle.width/2-width 
            && player.x < obstacle.x+obstacle.width/2+width
            && player.y > obstacle.y-obstacle.height/2-height 
            && player.y < obstacle.y+obstacle.height/2+height)
            || (obstacle.class=="Tree"
            && Math.sqrt(Math.pow(player.x-obstacle.x,2) + Math.pow(player.y-obstacle.y,2)) < entitySize + obstacle.obstructionRadius)) {
                return true
            }
        }
    }
    return false
}

export function checkCollision(playerID, obstacles, lakes, playerX, playerY, tx, ty, onWall, who, particlesTF=true, width=entitySize, height=entitySize, worldID="Main", entities={}) {
    let newX = playerX + tx;
    let newY = playerY + ty;
    var size = Math.max(width, height)
    var obstructionPadding = size/2 

    // check obstacles (trees/walls)
    if(!onWall){
        for(let w in obstacles){
            let obstacle = obstacles[w]
            let s = size/4
            if(obstacle.class == "Wall"){
                let width = obstacle.width
                let height = obstacle.height 
                let obstacleX = obstacle.x - width/2
                let obstacleY = obstacle.y - height/2
                if (newX + s >= obstacleX &&
                    newX - s <= obstacleX + width &&
                    obstacleY  <= playerY + s && 
                    playerY - s <= obstacleY + height) {
                    tx = 0;
                }
                if (newY + s >= obstacleY &&
                    newY - s <= obstacleY + height &&
                    obstacleX <= playerX + s && 
                    playerX - s <= obstacleX + width) {
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
    }

    // check entities
    //MAKE THIS CIRCULAR
    for (let e in entities) {
        let obstacle = entities[e];
        if (obstacle.id != playerID) {
            //can't be yourself!
            let factor = 0.6
            let pw = width * factor
            let ph = height * factor
            let ow = obstacle.width * factor
            let oh = obstacle.height * factor

            if(newX + pw/2 > obstacle.x - ow/2
            && newX - pw/2 < obstacle.x + ow/2
            && playerY + ph/2 > obstacle.y - oh/2
            && playerY - ph/2 < obstacle.y + oh/2){
                tx = 0
            }
            
            if(newY + ph/2 > obstacle.y - oh/2
            && newY - ph/2 < obstacle.y + oh/2
            && playerX + pw/2 > obstacle.x - ow/2
            && playerX - pw/2 < obstacle.x + ow/2){
                ty = 0
            }
        }
    }
    
    if (!onWall && particlesTF) {
        for (let l in lakes) {
            let lake = lakes[l];
            let distanceSquared = Math.pow(lake.x - playerX, 2) + Math.pow(lake.y - playerY, 2);
            if (distanceSquared <= Math.pow(lake.radius, 2)) {
                if (distanceSquared <= Math.pow(lake.radius - size * 2, 2)) {
                    return { 
                        tx: tx * lake.decreaseSpeedFactor, 
                        ty: ty * lake.decreaseSpeedFactor, 
                        addLakeParticle:true,
                    };
                } else{
                    return { 
                        tx: tx * lake.decreaseSpeedFactor, 
                        ty: ty * lake.decreaseSpeedFactor, 
                        addLakeParticle:false 
                    };
                }
            }
        }
    }
    return { 
        tx:tx, 
        ty:ty,
    };
}

export function test(){
    return "Success!"
}

/*
if (typeof module !== "undefined" && module.exports) {
    module.exports = { MAX_LOAD, MAX_IMMUNE_DURATION, entitySize, holdableItems, checkCollision, getOnWallStatus }
}
*/