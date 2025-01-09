/**
 * 
 * THIS JS DOCUMENT DEALS WITH THE IN-GAME ELEMENTS
 * 
 */

import { MAX_LOAD, MAX_IMMUNE_DURATION, entitySize, holdableItems, checkCollision, getOnWallStatus, random, test } from "/client/functions.js"
console.log(test())

//canvas with the actual game elements
const canvas = document.getElementById("canv")
const ctx = canvas.getContext("2d")
canvas.width = window.innerWidth
canvas.height = window.innerHeight

//canvas containing player data etc.
const ginfo = document.getElementById("info_canv")
const gctx = ginfo.getContext("2d")
ginfo.width = window.innerWidth
ginfo.height = window.innerHeight

window.addEventListener("resize", ()=>{
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    ginfo.width = window.innerWidth
    ginfo.height = window.innerHeight
    if(player) invSize = 75*5<window.innerWidth?75:window.innerWidth/5 //only if player exists
    
    gBarHeight = window.innerHeight * 40/847 
    createMarketBtn(holdableItems)

    scale = (Math.min(window.innerHeight, window.innerWidth)/8)/75
    maxScale = scale
    minScale = maxScale - 0.2
})

/************* SOCKET CONNECT *************************/
var socket = io()
var defaultFontFamily = window.getComputedStyle(document.body).fontFamily;

/************* VARS *************************/
//player
var player;
var currInvSlot = 0

//w_vars (Wait Variables)
var images = {} //loads images as needed
var borders = {}
var mapSize //defined soon!
var wallsList = [] //only the values
var lakesList = []
var marketsList = []

var marketOpen = false //

var obstacles = {}
var entities = {}

//var speedFactor = 1 //updated later, 1 as default

//ALL W_VARS DEFINED AFTER SERVER SENDS DATA
var canPlay = false
socket.on("sendStartData", (data)=>{
    initiateGameLoop()
    setupGame()

    borders = data.bordersObj
    //walls = data.structuresObj //send for map
    player = data.player
    mapSize = data.mapSize

    //player img
    for(let i in player.imgSrc){
        let img = player.imgSrc[i]
        let pimg = new Image()
        pimg.src = player.imgSrc[img]
        images[player.imgSrc[img]] = pimg 
    }
    

    canPlay = true
    updateAgain = true

    wallsList = data.walls //send for map
    lakesList = data.lakes //send for map
    marketsList = data.markets //send for map
})
//Make sure added variables are also emitted from the server-side
socket.on("reupdate", (data)=>{
    canPlay = true
    updateAgain = true

    borders = data.bordersObj
    //walls = data.structuresObj
    mapSize = data.mapSize
    wallsList = data.walls
    lakesList = data.lakes
    marketsList = data.markets
})


/************************************************/
/** @UPDATE !! */
// DRAWING FUNCTION
var scale = (Math.min(window.innerHeight, window.innerWidth)/8)/75
var maxScale = scale 
var minScale = maxScale - 0.2
/*
const MAXMAXSCALE = 1
const MINMINSCALE = .4
window.addEventListener("wheel", (e)=> {
    var increment = -e.deltaY/1000
    if(MINMINSCALE < scale && scale < MAXMAXSCALE
    ){
        maxScale += increment
        minScale += increment
        scale = minScale
    }
    console.log(increment, minScale, maxScale)
})*/

/******* DRAWING FUNCTION RIGHT HERE!! ************************************/
function updateCanv(info, serverPlayerCount, leaderboard){
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save();

    //scale
    if(player.onWall){
        if(scale>minScale){scale-=0.05}//transition effect
    } else{
        if(scale<maxScale){scale+=0.05} //transition effect
    }
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(scale, scale);
    ctx.translate(-canvas.width/2, -canvas.height/2);

    //center on player (panning)
    let centerX = canvas.width/2 - player.x
    let centerY = canvas.height/2 - player.y
    if(player) ctx.translate(centerX, centerY);

    //draw!
    info.forEach(item=>{
        //(NOT really drawing, but adding walls, obstacles to list)

        ctx.save()
        ctx.translate(item.x, item.y)
        if(item.isCircle){
            ctx.fillStyle = item.color;
            ctx.beginPath();
            ctx.arc(0, 0, item.size, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();
        } else if(item.isRect){
            ctx.fillStyle = item.color;
            ctx.fillRect(item.x, item.y, item.width, item.height)
        }
        else{ 
            let pic
            if(typeof(item.imgSrc) == "string"){
                pic = item.imgSrc
            }  
            else{
                if (item.status && item.imgSrc[item.status[0]]) {
                    pic = item.imgSrc[item.status[0]]
                } else {
                    pic = item.imgSrc["Wandering"]
                }
            }
            //Draw tree opaque function
            if(item.class == "Tree"){
                if(Math.sqrt(Math.pow(player.x - item.x, 2) + Math.pow(player.y - item.y, 2)) > 250){ // dist till tree is not opaque
                    pic = item.opaqueImgSrc
                } else{
                    //draw stump (NEEDS WORK!!)
                    ctx.fillStyle = "#140d06AA";
                    ctx.beginPath();
                    ctx.arc(0, 0, item.obstructionRadius, 0, Math.PI * 2, true);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            //create a loaded image if not existant
            if(!images[pic]){
                images[pic] = new Image()
                images[pic].src = pic
            }
            
            //if on wall, scale up by 10 px
            let addSize = 0
            if(item.onWall) addSize = 10 
            
            //draw
            ctx.rotate(item.rotation)
            ctx.drawImage(
                images[pic], 
                -item.width/2 - addSize/2, 
                -item.height/2 - addSize/2, 
                item.width + addSize, 
                item.height + addSize)
        }
        //draw held item
        if(item.inventory){
            var heldItem = item.inventory[item.invSelected]
            let p = heldItem.imgSrc
            if(p !== null){
                if(!images[p]){
                    images[p] = new Image()
                    images[p].src = p
                }
                let holdingIconSize = 50
                let x = -item.width/2
                let y = item.height/2
                let extraRot = 0
                if(item.status[0].slice(0, 7) == "Hitting"){
                    console.log("Ho!")
                    x += item.width/10
                    y += item.height/10
                    extraRot = -Math.PI/8
                }
                ctx.translate(x,y)
                //all items default rotated by Math.PI
                ctx.rotate(Math.PI + heldItem.rotation + extraRot)
                //ctx.fillStyle="red"
                //ctx.fillRect(-5,-5,10,10)
                ctx.drawImage(images[p],-holdingIconSize/2,-holdingIconSize/2,holdingIconSize,holdingIconSize)
                
            }
        }
        ctx.restore() 
        
        //SHOW HEALTH (formerly showHealth() method)
        if(item.health < item.maxHealth && item.showH){
            let w = 50
            let h = 10
            let x = -w/2
            let y = -item.size * 3/4
            ctx.save()
            ctx.translate(item.x, item.y)
            ctx.fillStyle = "rgb(0,0,0, 0.5)"
            ctx.fillRect(x, y, w, h)
            ctx.fillStyle = "rgb(0,235,0, 0.8)"
            ctx.fillRect(x, y, w * (item.health/item.maxHealth), h)
            ctx.restore()
        }   

        //draw username
        if(item.type=="player"){
            // Set text properties
            ctx.save()
            ctx.translate(item.x, item.y)
            let fontSize = 24;
            ctx.font = `${fontSize}px ${defaultFontFamily}`;
            let username = item.username;
            let width = ctx.measureText(username).width * 0.675 //to fill entire space (width of rect)
            let x = -width/1.4; //to get aligned with center
            let y = entitySize;

            // Draw background
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(x - 5, y - fontSize + 5, width * 1.5 + 10, fontSize + 10);

            // Draw text
            ctx.fillStyle = "white";
            ctx.fillText(username, x, y);
            ctx.restore()
        }

        /***** EAT ***** EAT ***** EAT ***** EAT ***** EAT ******/
        // initiate player eat!
        if(player && item.type=="pickable" 
        && Math.abs(item.x - player.x) < entitySize/2
        && Math.abs(item.y - player.y) < entitySize/2){
            socket.emit("eat", {
                who:player,
                what:item,
                id:player.id,
                worldID:player.worldID,
            })
        }

        // this guy is immune!
        if(item.immuneDuration && item.immuneDuration > 0){
            //Draw an outline showing that this guy is immune
            let idcRadius = entitySize * 3/4;
            let idcCenterX = item.x
            let idcCenterY = item.y
            let outlinePercentage = item.immuneDuration / MAX_IMMUNE_DURATION; 
            {
                // Circle
                ctx.beginPath();
                ctx.arc(idcCenterX, idcCenterY, idcRadius, 0, 2 * Math.PI);
                ctx.fillStyle = "#718CC8AA";
                ctx.fill();
                // Draw the outline
                let endAngle = outlinePercentage >= 0 ? (2 * Math.PI * outlinePercentage) : 0;
                ctx.beginPath();
                ctx.arc(idcCenterX, idcCenterY, idcRadius * 1.1, 0, endAngle);
                ctx.strokeStyle = '#718CC8'; // Outline color
                ctx.lineWidth = idcRadius * 0.1; // Outline width
                ctx.stroke();
            }
        }
        
    })
    ctx.restore();

    //game data
    gctx.clearRect(0, 0, ginfo.width, ginfo.height)
    //dont show if player dead
    if(player && player.health > 0){
        //d... is a div data
        dHealth()
        dLeaderboardData(serverPlayerCount, leaderboard)

        //g... done on gctx canvas (ctx rendering)
        gXP()
        gActivateSpeedBar()
        //gShadow()
        drawInventory()
        gAttackCursor()
        gShowCountdown()
        //close if market is open
        if(!marketOpen){
            gMap()
        }
    }
    updateAgain = true//allow update
}
// UPDATECANV DRAWING FUNCTION RUN WHEN INFO SENT FROM SERVER 
//(REGULAR UPDATE)
socket.on("sendUpdateDataToClient", (info) => {
    // Don't update data if the player is dead
    if (canPlay && player && player.health > 0) {
        // Variables that should not be overriden by update
        let savedInv = player.inventory;
        // Update player data
        player = info.player;
        // Restore the saved inventory if needed
        if (reorderInventory) player.inventory = savedInv;

        // EXCLUDE updating "cooldownTimer" property in inventory
        for(let s in player.inventory){
            player.inventory[s].cooldownTimer = savedInv[s].cooldownTimer
        };

        // Update walls list with provided structures
        wallsList = info.structures;
        obstacles = info.updateContent.filter(item => item.class == "Tree" || item.class == "Wall" || item.class == "Stairs")
    }
    /** @Note
     * The updateCanv function is outside of the "player.health > 0"
     * condition in order for a "spectator" view to be allowed after
     * death.
     */
    updateCanv(info.updateContent, info.serverPlayerCount, info.leaderboard);
    entities = info.entities
});

/** @GAME_DETAILS */
var gBarHeight = window.innerHeight * 40/847 //also in resize
var healthBar = document.getElementById("healthBar")
var healthBarBackground = document.getElementById("healthBarBackground")
function dHealth(){
    /*
    let width = canvas.width
    let height = gBarHeight
    let fontSize = gBarHeight * 0.5
    gctx.fillStyle = 'black'
    gctx.fillRect(0, canvas.height-height, width, height)
    gctx.fillStyle = "rgb(120, 210, 156)"
    gctx.fillRect(0, canvas.height-height, width * (player.health/player.maxHealth), height)
    gctx.fillStyle = 'black'
    gctx.font = `${fontSize}px ${defaultFontFamily}`
    gctx.fillText (`HEALTH ${Math.round(player.health)}`, 0, canvas.height-height+fontSize)
    */
    let health = Math.round((player.health/player.maxHealth) * 100)
    healthBar.style.width = `${health}%`
    document.getElementById("healthQuantity").innerHTML = `${health}`
}
var xpImg = new Image()
xpImg.src = "/imgs/Money.svg"
function gXP(){
    let padding = 5
    let size = gBarHeight
    gctx.drawImage(xpImg, padding, canvas.height-size * 3 - padding, size, size)
    gctx.fillStyle = 'white'
    gctx.font = `${gBarHeight * 3/4}px ${defaultFontFamily}`
    gctx.fillText (`XP ${player.xp}`, size + padding, canvas.height-size * 3 - padding + size)
}
var speedTime = 100 // Actual time
var speedTimeMax = 100 // Max time (used as reference)
var speedImg = new Image()
speedImg.src = "/imgs/Speed.png"
var sprint = false //aka speed on?
socket.on("speed", ()=>{speedTime += 25}) //1/4 of speed
var spCircleRadius = canvas.width * 0.05;
var spX = canvas.width - spCircleRadius * 2;
var spY = canvas.height - (gBarHeight + 15) - spCircleRadius; // Give padding above health bar
var displayHelp = false
/**************** SPEED BAR *********************** */
function gActivateSpeedBar() {
    //update
    spCircleRadius = canvas.width * 0.05;
    spX = canvas.width - spCircleRadius * 2;
    spY = canvas.height - (gBarHeight + 15) - spCircleRadius;
    let outlinePercentage = speedTime / speedTimeMax; 
    {
        // Circle
        gctx.beginPath();
        gctx.arc(spX, spY, spCircleRadius, 0, 2 * Math.PI);
        gctx.fillStyle = "#8FEAEEAA";
        gctx.fill();

        // Calculate position for the image
        let imgWidth = spCircleRadius
        let imgHeight = spCircleRadius 
        let imgX = spX - imgWidth / 2;
        let imgY = spY - imgHeight / 2;

        // Draw the image in the center of the circle
        gctx.drawImage(speedImg, imgX, imgY, imgWidth, imgHeight);

        // Draw the outline
        let endAngle = outlinePercentage >= 0 ? (2 * Math.PI * outlinePercentage) : 0;
        gctx.beginPath();
        gctx.arc(spX, spY, spCircleRadius * 1.1, 0, endAngle);
        gctx.strokeStyle = '#CEFDFFaa'; // Outline color
        gctx.lineWidth = spCircleRadius * 0.1; // Outline width
        gctx.stroke();
    }

    if(sprint && speedTime > 0 && (tx != 0 || ty != 0)) { //have to have speed time and be moving to lose speed
        speedTime -= 0.25
        player.speed = 10
    } else {
        // Circle
        gctx.beginPath();
        gctx.arc(spX, spY, spCircleRadius, 0, 2 * Math.PI);
        gctx.fillStyle = "#00000050";
        gctx.fill();
        player.speed = 5
        speedTime += 0.01
    }    

    let div = document.getElementById("floatingInfoDiv")
    if(displayHelp){
        let text = "<span>Move and Hold <img src=\"imgs/IconsK_X.png\" width=20 height=20> to Sprint</span>"
        div.innerHTML = text
        div.style.display = "block"
        div.style.left = mouse.x+canvas.width/2-350
        div.style.top = mouse.y+canvas.height/2-50
    } else{
        div.style.display = "none"
    }
}
// Add help display if hover over speed bar icon
document.addEventListener("mousemove", function(event) {
    // Get mouse coordinates relative to the canvas
    let rect = canvas.getBoundingClientRect();
    let mouseX = event.clientX - rect.left;
    let mouseY = event.clientY - rect.top;
    //display help for sprinting
    let distanceToCenter = Math.sqrt(Math.pow(mouseX - spX, 2) + Math.pow(mouseY - spY, 2));
    if (distanceToCenter <= spCircleRadius) {
        displayHelp = true
    } else {displayHelp = false}
})

var attackCursorOn = false
function gAttackCursor(){
    var tool = player.inventory[player.invSelected]
    var hitRange = (tool.hitRange? tool.hitRange:entitySize) * scale
    
    if((mouse.x)**2 + (mouse.y)**2 <= hitRange ** 2){
        let rangeCursorX = mouse.x + ginfo.width/2
        let rangeCursorY = mouse.y + ginfo.height/2

        //assume...
        var percent = 100
        var fillColor = "rgba(0,0,0,0.2)"
        var strokeColor = "rgba(0,0,0,0.5)"
        //if cool down timer...
        if(tool.cooldownTimer != 0){
            //cooldown = true
            percent = tool.cooldownTimer/tool.cooldownTime
            fillColor = "rgba(136,136,136,0.2)"
            strokeColor = "rgba(136,136,136,0.5)"
        } 

        gctx.fillStyle = fillColor
        gctx.strokeStyle = strokeColor
        gctx.lineWidth = 5
        gctx.beginPath()
        gctx.arc(rangeCursorX, rangeCursorY, player.hitSize/2, 0, 2 * Math.PI * percent)
        gctx.fill()
        gctx.stroke()

        attackCursorOn = true //allows attack sends
    } else {attackCursorOn = false}
}
function dLeaderboardData(serverPlayerCount, leaderboard){
    if(document.getElementById("leaderboardOnOffSlider").checked == false){
        document.getElementById("leaderboard").style.display = "none"
        return
    }

    document.getElementById("leaderboard").style.display = marketOpen?"none":"block"
    for (let i = 0; i < 5; i++) {
        let lbSlot = document.getElementById(`leaderboardSlot${i+1}`)
        if (leaderboard[i]) {
            let text = `${i+1}. ${leaderboard[i].kills} Kills  ${leaderboard[i].username}`

            //is this you?
            if(leaderboard[i].id == player.id){
                lbSlot.style.color = "gold"
            } else{
                lbSlot.style.color = "white"
            }
            lbSlot.innerHTML = text
        } else{
            lbSlot.innerHTML = `${i+1}.`
            lbSlot.style.color = "white"
        }
    }
    document.getElementById("playersInServer").innerHTML = `Players in server: ${serverPlayerCount}`
}
var mapOff = true
function gMap(){
    if(document.getElementById("mapOnOffSlider").checked == false) return

    let paddingForMapOn = 15
    let size = mapOff?(canvas.height * 1/6):Math.min(canvas.height, canvas.width)-paddingForMapOn //added mapSfSize to balance out offset
    let sf = size/mapSize //scale factor
    let mapSfSize = (n) => n * sf
    let x = mapOff?0:canvas.width/2 - size/2 - paddingForMapOn/4
    let y = mapOff?(canvas.height - gBarHeight * 3.5 - size):canvas.height/2 - size/2 - paddingForMapOn/4

    //background
    gctx.fillStyle = "#000000dd"
    gctx.fillRect(x,y,size+mapSfSize(player.width),size+mapSfSize(player.height))
    gctx.lineWidth = 2.5
    gctx.strokeStyle = "#ffffffaa"
    gctx.strokeRect(x,y,size+mapSfSize(player.width),size+mapSfSize(player.height))
    
    //structures + markets
    gctx.save()
    gctx.translate(x+size/2,y+size/2)
    
    
    //draw lakes on map
    for(const lake of lakesList){
        gctx.fillStyle = "#188B8F"
        gctx.beginPath();
        gctx.arc(lake.x * sf, lake.y * sf, lake.size * sf, 0, Math.PI * 2, true);
        gctx.closePath();
        gctx.fill();
    }
    //draw walls on map
    for(const wall of wallsList){
        if(wall.class == "Wall") {gctx.fillStyle = "gray"}
        else {gctx.fillStyle = "green"}
        gctx.fillRect(wall.x*sf,wall.y*sf,mapSfSize(wall.width),mapSfSize(wall.height))
    }
    //draw markets on map
    for(const market of marketsList){
        gctx.fillStyle = "#1E90FF"
        gctx.fillRect(market.x*sf,market.y*sf,mapSfSize(market.width),mapSfSize(market.height))
    }

    gctx.restore()
    gctx.save()
    gctx.translate(x+size/2,y+size/2)
    //draw important entities
    for(let key in entities){
        let e = entities[key]
        gctx.fillStyle = "green"
        gctx.fillRect(e.x*sf,e.y*sf,mapSfSize(100),mapSfSize(100))
    }

    gctx.fillStyle = "red"
    gctx.fillRect(player.x*sf,player.y*sf,mapSfSize(100),mapSfSize(100))
    gctx.restore()
}

var respawnTime = null
function gShowCountdown() {
    socket.emit("GetCountdownInfo", {
        id:player.id,
        worldID:player.worldID
    })
    if (respawnTime) {
        let fontSize = 20
        gctx.font = `bold ${fontSize}px ${defaultFontFamily}`;

        let pad = 15
        let x = pad
        let y = invSize + fontSize + pad

        gctx.fillStyle = "white";
        gctx.fillText("Boss respawning in ", x, y);

        if(respawnTime <= 20) gctx.fillStyle = "red"; //20s red text warning
        gctx.fillText(`${respawnTime}s`, gctx.measureText("Boss respawning in ").width + x, y);
    }
}
socket.on("SendCountdownInfo", function(data){
    respawnTime = data.time
})

/** *** @Inventory  *** */
// "invSize" also updated in the canvas resize 
var invSize = 75*5<window.innerWidth?75:window.innerWidth/5 //5 bc of slots
var invY = 0
var reorderInventory = false; 
// contains inventory drawing as well as item name displayer
function drawInventory(){
    gctx.fillStyle = "#000000aa"
    var inventoryX = 0
    var inventoryY = 0
    var inventoryW = invSize * player.inventory.length
    var inventoryH = invSize
    gctx.fillRect(inventoryX, inventoryY, inventoryW, inventoryH)
    gctx.save()
    for(let invSpot in player.inventory){
        let each = player.inventory[invSpot]
        let strokeWidth = invSize * 10/75 //how thick the inv slot is
        //outline // invSelected
        //PICTURE of icon (if any)
        var x = invSpot * invSize
        var y = invY
        var w = invSize
        var h = invSize
        if(each.imgSrc){
            if(!images[each.imgSrc]){
                images[each.imgSrc] = new Image()
                images[each.imgSrc].src = each.imgSrc
            }
            gctx.drawImage(images[each.imgSrc], x, y, w, h)
        }
        //DURABILITY bar
        if(each.durability < each.maxDurability){
            let durabilityW = w - strokeWidth * 2
            let durabilityBarH = 5
            let durabilityX = x + strokeWidth
            let durabilityY = h - durabilityBarH*3
            var tool = each
            //background bar
            gctx.fillStyle = "#353535"
            gctx.fillRect(durabilityX, durabilityY, durabilityW, durabilityBarH)
            //dur bar
            gctx.fillStyle = getDurabilityColor(tool.durability, tool.maxDurability)
            gctx.fillRect(durabilityX, durabilityY, durabilityW * (each.durability/each.maxDurability), durabilityBarH)
        }  
        //SHADED out if timer on
        let timerPercentage = each.cooldownTimer/each.cooldownTime
        gctx.fillStyle = "#ffffffaa"
        gctx.fillRect(x - strokeWidth/2, y + invSize, w, -(h - strokeWidth) * timerPercentage)

        //OUTLINE
        gctx.lineWidth = strokeWidth;
        gctx.strokeStyle = "gray"
        gctx.strokeRect(x, y, w, h)        

        //(if stackable) give it a NUMBER to show how many you have
        if(each.maxStackSize > 1){
            gctx.font = `15px ${defaultFontFamily}`;
            gctx.fillStyle = "white";
            //align on right
            gctx.fillText(each.stackSize, invSpot * (invSize) + invSize - ctx.measureText(`${each.stackSize}`).width - strokeWidth - 5, invSize - 15); 
        }

        //update cooldown timer
        if(each.cooldownTimer > 0){
            player.inventory[invSpot].cooldownTimer -= 1
        } else if(each.cooldownTimer < 0){
            player.inventory[invSpot].cooldownTimer = 0
        }
    }
    gctx.restore()
    //selected
    gctx.lineWidth = invSize * 10/75;
    gctx.strokeStyle = "white"
    gctx.strokeRect(currInvSlot * invSize,y,w,h)

    displayToolName()
    displayToolDurabilityOnHover(inventoryX, inventoryY, inventoryW, inventoryH)
}
// get the color for a given durability (for dur bar & text)
function getDurabilityColor(dur, maxDur){
    if(dur < 0.1 * maxDur){
        return "#CB4444"
    } else if (dur < 0.25 * maxDur){
        return "#CB6E44"
    } else if (dur < 0.5 * maxDur){
        return "#CBC044"
    } else if (dur < 0.6 * maxDur){
        return "#AFCA43"
    }
    return "#63CA43"
}
// display tool name on top of bar when holding
function displayToolName(){
    //ITEM NAME DISPLAYER
    //draw item name
    var item = player.inventory[player.invSelected]
    var name = item.name
    if(name !== "Hand"){
        var fontSize = gBarHeight - 2.5
        var charSpace = fontSize/2 //10 spaces for every character
        gctx.font = `${fontSize}px ${defaultFontFamily}`;
        var len = gctx.measureText(name).width 
        var paddingW = fontSize/2
        var paddingH = fontSize/2
        var x = ginfo.width/2 - paddingW - len/2
        var y = ginfo.height - gBarHeight - charSpace - paddingH
        //box 
        gctx.fillStyle = `#00000099`
        //note, the box is drawn negated, so + = -
        gctx.fillRect(x-paddingW/2, y+paddingH/2, len+paddingW, -(fontSize+paddingH))
        //HEADING name
        gctx.fillStyle = `#ffffff`;
        gctx.fillText(name, x, y);  
    }
}
function displayToolDurabilityOnHover(inventoryX, inventoryY, inventoryW, inventoryH){
    // draw tool durability if mouse over
    var durDiv = document.getElementById("floatingDurabilityDiv")
    var tool = player.inventory[Math.floor(mouse.clientX/invSize)]

    if(mouse.clientX > inventoryX && mouse.clientX < inventoryX + inventoryW
    && mouse.clientY > inventoryY && mouse.clientY < inventoryY + inventoryH
    && tool.durability){
        // update the div
        var text = `
        <!--Name-->
        <span style="color:white">
        <b>${tool.name}</b>
        </span>

        <br><br>

        <!--Damage-->
        <span style="color:#EC7E7E">
        <b>+${tool.damage}</b>
        </span> Damage

        <br><br>

        <!--Durability-->
        <b><span style="color:${getDurabilityColor(tool.durability, tool.maxDurability)}">${tool.durability}</span>/${tool.maxDurability}</b> Durability
        `
        durDiv.innerHTML = text
        durDiv.style.display = "block"
        durDiv.style.left = mouse.x+canvas.width/2
        durDiv.style.top = mouse.y+canvas.height/2
    } else if(durDiv.style.display == "block"){
        durDiv.style.display = "none"
    }
}
// // //
socket.on("giveInventoryItemCooldownTime", function(data){
    if(player.health > 0){
        let selectedTool = player.inventory[data.id];
        // Set attack cooldown status
        player.inventory[data.id].cooldownTimer = selectedTool.cooldownTime // add cooldown time
    }
})

/***********************************************/
/** @MOVEMENT_CONTROLS */
/************* KEYS *************************/
var keyDown = false
var pressedKeys = []
var mouse = {
    x: 0, 
    y: 0, 
    // raw forms 0,0 = top corner
    clientX: 0, 
    clientY: 0, 
}
//defined when game starts
// these are what each event listener will do
var tx = 0
var ty = 0
/** NOTE: ~ How Moving Works ~
 * When a key is pressed, it is stored inside of "keySet = {}". The
 * key is then performed in "performActions()". When "keyUp", the 
 * key is removed from "keySet". "performActions()" checks for any
 * key pressed. If no keys are pressed (including the space bar), then
 * tx, ty = 0. No movement. Else, each key is acted to accordingly. 
*/
var keySet = {}; // Initialize set to store keys
// Event listener for keydown
function keydown(event) {
    event.preventDefault();
    event.stopPropagation();
    keySet[event.key.toLowerCase()] = true;
};
// Event listener for keyup
function keyup(event) {
    event.preventDefault();
    event.stopPropagation();
    delete keySet[event.key.toLowerCase()];
};
/************* KEYS  INTERPRETER ************/
// Function to perform actions based on keys in the set
function performActions() {
    // Handle other keys first
    sprint = keySet["x"] && speedTime > 0;

    if (keySet["1"]) currInvSlot = 1 - 1;
    if (keySet["2"]) currInvSlot = 2 - 1;
    if (keySet["3"]) currInvSlot = 3 - 1;
    if (keySet["4"]) currInvSlot = 4 - 1;
    if (keySet["5"]) currInvSlot = 5 - 1;

    if (keySet["q"]) {
        let allDrop = "control" in keySet //+ ctrl to drop all
        socket.emit("drop", {
            playerInvI: currInvSlot,
            x: player.x - Math.cos(player.rotation + player.defaultRotation) * entitySize * 2,
            y: player.y - Math.sin(player.rotation + player.defaultRotation) * entitySize * 2, //defaultRotation needs to be included because that's the default, etc. at 0. rotation is just the current rotation
            allDrop : allDrop,
            id:player.id,
            worldID: player.worldID
        });
        delete keySet["q"] //drop 1 only!
    }

    if (keySet["e"]) {
        toggleMarket()
        delete keySet["e"] //perform once only!
    }

    //mapOff toggle [Y]
    if (keySet["y"]) {
        mapOff = (mapOff === false)
        delete keySet["y"] //drop 1 only!
    }

    //MOVEMENT
    let movementKeys = ["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"];

    // Check if any movement key is currently pressed
    let movementKeyPressed = movementKeys.some(key => keySet[key]);

    // If no movement key is pressed and the spacebar is not pressed, reset the corresponding movement component
    if (!movementKeyPressed && !keySet[" "]) {
        tx = ty = 0;
    } else if (keySet[" "]) { 
        //player rotation must be adjusted 180 deg (PI rad)
        tx = Math.cos(player.rotation + player.defaultRotation + Math.PI) * player.speed;
        ty = Math.sin(player.rotation + player.defaultRotation + Math.PI) * player.speed;
    } else { // If movement keys are pressed, handle movement
        tx = (keySet["d"] || keySet["arrowright"]) ? player.speed : (keySet["a"] || keySet["arrowleft"]) ? -player.speed : 0;
        ty = (keySet["s"] || keySet["arrowdown"]) ? player.speed : (keySet["w"] || keySet["arrowup"]) ? -player.speed : 0;
    }
}

/************* MOUSE ***********************/
// Drag functions 
var dragStartX = 0;
var dragStartY = 0;
var draggedItemIndex = -1;
var lastEnteredSlot = -1; // Track the last inventory slot entered by the mouse

function mousemove(e) {    
    // calculate the mouse position relative to the canvas center
    mouse.clientX = e.clientX
    mouse.clientY = e.clientY // raw forms 0,0 = top corner
    mouse.x = e.clientX - canvas.width / 2;
    mouse.y = e.clientY - canvas.height / 2;

    //all others above this point ^^^
    // reorder inventory

    if (!reorderInventory || draggedItemIndex === -1) return;

    let mouseX = e.clientX - canvas.getBoundingClientRect().left;
    let mouseY = e.clientY - canvas.getBoundingClientRect().top;

    // Calculate the index of the slot under the mouse cursor
    let newIndex = Math.floor(mouseX / invSize);

    // Check if the mouse cursor has entered a new slot
    if (newIndex !== lastEnteredSlot && newIndex < player.inventory.length) {
        if (player.inventory[newIndex].name === draggedItem.name) {
            //is there enough room for all?
            if(player.inventory[newIndex].maxStackSize < draggedItem.stackSize + player.inventory[newIndex].stackSize){
                let increase = player.inventory[newIndex].maxStackSize - player.inventory[newIndex].stackSize
                let increase2 = draggedItem.stackSize - increase
                
                draggedItem.stackSize = player.inventory[newIndex].stackSize + increase

                player.inventory[newIndex].stackSize = increase2
            }
            else{
                player.inventory[newIndex].stackSize += draggedItem.stackSize;
                // Clear the dragged item from the inventory
                player.inventory.splice(draggedItemIndex, 1, {...holdableItems["Hand"]});
                // Reset draggedItemIndex
                draggedItemIndex = -1;
                // Redraw the inventory
                drawInventory();
                return;
            }            
        }

        // Update the position of the dragged item in the inventory
        let removedItem = player.inventory.splice(draggedItemIndex, 1)[0];
        player.inventory.splice(newIndex, 0, removedItem);
        draggedItemIndex = newIndex;
        drawInventory();
        lastEnteredSlot = newIndex; // Update the last entered slot
    }
}

//is mouse down and still down?
var holding = null
var holdDuration = 1
var draggedItem
function mousedown(e) {
    //holding operations
    holding = setInterval(()=>{
        holdDuration += 1
        if(player.inventory[player.invSelected].name == "Bow"){
            emitMousedownEvent()
        }
    }, 350) // every  s
    // BOW COOLDOWN DURATION (COOLDOWN TIMER) DEFINED HERE

    // cannot switch inv while help open, cannot attack
    // also, cannot activate when pressing btns
    if (e.target.tagName.toLowerCase() !== 'button') {
        let clickedInv = false;
        for (let i = 0; i < player.inventory.length; i++) {
            let x = i * invSize;
            let y = invY;
            if (x < e.clientX && e.clientX < x + invSize && y < e.clientY && e.clientY < y + invSize) {
                currInvSlot = i;
                i += player.inventory.length;
                clickedInv = true;
            }
        }
        
        if (player.health > 0 
            && !clickedInv 
            && player.inventory[player.invSelected].cooldownTimer == 0
            && attackCursorOn
            && player.inventory[player.invSelected].name !== "Bow"
        ){// Check if not in cooldown
            //EMIT MOUSE DOWN EVENT (function performed in APP.Js (server-side))
            emitMousedownEvent()
        }
    }

    let mouseX = e.clientX - canvas.getBoundingClientRect().left;
    let mouseY = e.clientY - canvas.getBoundingClientRect().top;

    // Check if the mouse click is within an inventory slot
    let clickedItemIndex = Math.floor(mouseX / invSize);
    if (clickedItemIndex >= 0 && clickedItemIndex < player.inventory.length && mouseY <= invSize) {
        reorderInventory = true
        dragStartX = mouseX;
        dragStartY = mouseY;
        draggedItemIndex = clickedItemIndex;
        draggedItem = player.inventory[clickedItemIndex]; // Store the dragged item
        lastEnteredSlot = clickedItemIndex; // Update the last entered slot
    }
}
function emitMousedownEvent(){
    socket.emit("mousedown", {
        x: player.x + (mouse.x / scale),
        y: player.y + (mouse.y / scale),
        scale: scale,
        invID: player.invSelected,
        holdDuration: holdDuration,
        id:player.id,
        worldID: player.worldID,
    });    
}

function mouseup(e) {
    //check if clicked inv
    let clickedInv = false;
    for (let i = 0; i < player.inventory.length; i++) {
        let x = i * invSize;
        let y = invY;
        if (x < e.clientX && e.clientX < x + invSize && y < e.clientY && e.clientY < y + invSize) {
            currInvSlot = i;
            i += player.inventory.length;
            clickedInv = true;
        }
    }
    //reset holding vars
    if(holding){
        if(e.target.tagName.toLowerCase() !== 'button' 
        && !clickedInv
        && player.health > 0 
        && player.inventory[player.invSelected].cooldownTimer == 0){
            socket.emit("mouseup", {
                holdDuration:holdDuration,
                id:player.id,
                worldID: player.worldID
            })
        }
        holdDuration = 0
        clearInterval(holding)
    }

    //
    if (!reorderInventory || draggedItemIndex === -1) return;
    draggedItemIndex = -1;
    reorderInventory = false;
}

/** @NOTE: 
 * On phone, touching simply activates the "Space" bar.
*/
var touching = false
function touchstart(e){
    if(!marketOpen){
        keySet[" "] = true;
        touching = true
    }
}
function touchend(e){
    if(!marketOpen){
        delete keySet[" "]
        touching = false
    }
}


/** @Update */
// Request data to update canv
var updateAgain = false
socket.on("allowUpdate", ()=>{updateAgain = true})
var gameLoopInt // TO BE THE GAME LOOPA! (currently undefined)


/************** START/JOIN/STOP GAME  *************/
/**
 * NOTE:
 * Because this file is a type module file, functions
 * used in HTML buttons must be specifically declared
 * with window.___ functions. 
 */
window.joinGame = function joinGame(value=null){
    if(!value){
        value = document.getElementById("join_game_input").value
        console.log(value)
    }

    startGame(value)
}
window.createNewWorld = function createNewWorld(){
    //create ID
    let st = ""
    for(let i = 0; i < 6; i ++){
        st += String(random(9, 0))
    }
    console.log(st)
    startGame(st, true)
}
window.gameOn = false
function startGame(worldID = "Main", createWorld=false, username=null){
    /*****************************************************/
    //ask server for starting data and create new ID
    var selectedValue = document.getElementById("skins-image-options").querySelector("input[name='option']:checked").value
    console.log("World ID = ", worldID)
    socket.emit("askForStartData", {
        username: username?username:document.getElementById("username").value,
        img:selectedValue,
        worldID:worldID, //WORLD THAT THE PLAYER JOINS
        createWorld:createWorld
    })//start game loop

    //Actual stuff called when server responds.
}
// Starts the game loop
function initiateGameLoop(){
    gameLoopInt = setInterval(()=>{
        //player update
        if(player && updateAgain && canPlay) {
            console.log(player.status)
            //update worldIDDiv
            if(player.worldID){
                document.getElementById("worldIDDiv").style.display = "block"
                document.getElementById("worldIDSpan").innerHTML = player.worldID
            }

            if(player.health > 0){ 
                performActions() //get tx,ty from keys
                //close market if attacked
                if(lastHealthBeforeMarket > player.health) toggleMarket()
                
                var resetX = false
                var resetY = false
                //knockback?
                if(player.knockbackDue.x!=0){
                    tx -= player.knockbackDue.x
                    resetX = true
                }
                if(player.knockbackDue.y!=0){
                    ty -= player.knockbackDue.y
                    resetY = true
                }

                //check if in border
                if (player.x + tx >= borders.R 
                || player.x + tx <= borders.L){
                    tx = 0
                }
                if (player.y + ty >= borders.U 
                || player.y + ty <= borders.D){
                    ty = 0
                }

                player.onWall = getOnWallStatus(obstacles, player)//oW

                //check if hit wall
                let possibleNewXY = checkCollision(player.id, obstacles, lakesList, player.x, player.y, tx, ty, player.onWall, null, true, player.width==player.height?player.width:Math.max(player.width, player.height), player.worldID, entities)
                //add particles
                if(possibleNewXY.addLakeParticle){
                    socket.emit("addParticles", {
                        id:player.id,
                        x:player.x,
                        y:player.y,
                        worldID:player.worldID
                    })
                }

                let newCoords = possibleNewXY
                tx = newCoords.tx
                ty = newCoords.ty

                player.x += tx
                player.y += ty
                player.invSelected = currInvSlot
                player.rotation = (Math.atan2(mouse.y, mouse.x)) + player.defaultRotation
                socket.emit("updatePlayer", {
                    player:player,
                    id:player.id,
                    reorder: reorderInventory,
                    worldID:player.worldID,
                    resetX:resetX,
                    resetY:resetY
                })  

                let inMarket = false
                //check if on market
                for(let m in marketsList){
                    let market = marketsList[m]
                    if(player.x > market.x - market.width/2 
                    && player.x < market.x + market.width/2 
                    && player.y > market.y - market.height/2 
                    && player.y < market.y + market.height/2){
                        inMarket = true
                        break
                    }
                }
                if(inMarket){
                    //display market btn
                    document.getElementById("showMarketBtn").style.display = "block"
                } else{
                    //dedisplay market btn
                    document.getElementById("showMarketBtn").style.display = "none"
                    document.getElementById("showMarketBtn").innerHTML = "Market"
                    document.getElementById("market").style.display = "none"
                    document.getElementById("marketBackground").style.display = "none"
                    marketOpen = false //
                }
            } else{
                //get rid of market btn if over
                document.getElementById("showMarketBtn").style.display = "none"

                //Update death message ONLY IF IT EXISTS [A4dh3dfDM9]
                if(player.deathMessage) document.getElementById("deathMessageText").innerHTML = player.deathMessage

                gameOn = false
            }
            socket.emit("requestUpdateDataFromServer", {
                id: player.id,
                x:player.x,
                y:player.y,
                worldID:player.worldID
            }) //gives data to draw  
            updateAgain = false  
        }
    }, 0.01) //0.01
}
// Function that turns things off/on as needed when game begins
function setupGame(){
    gameOn = true
    //zoom in spawn effect
    scale = minScale
    //reset or set these:
    tx = 0
    ty = 0
    //set these:
    /************ RESET BTNS *********************/
    //document.getElementById("exitGameBtn").style.display = "none"
    document.getElementById("preGame_Stuff_OuterDiv").style.display = "none"
    document.getElementById("startGameBtn").style.display = "none"
    document.getElementById("gameOver").style.display = "none"
    /************ ADD EVENT LISTENERS *********************/
    document.addEventListener("keydown", keydown)
    document.addEventListener("keyup", keyup)
    document.addEventListener("mousemove", mousemove)
    document.addEventListener("mousedown", mousedown)
    document.addEventListener("mouseup", mouseup)
    // (for mobile)
    document.addEventListener("touchstart", touchstart)
    document.addEventListener("touchend", touchend)
    
    /**Show game divs */
    document.getElementById("inGame_Stuff").style.display = "block"
    /* Add leave game icon btn*/
    document.getElementById("exitGameIconBtn").style.display = "block"
}
window.startGame = startGame
window.rejoinGame = function rejoinGame(){
    clearInterval(gameLoopInt)
    canPlay = false
    console.log(player.worldID)
    startGame(player.worldID, false, player.username)
}
// Function that turns things off/on as needed when game is over
window.exitGame = function exitGame(){
    gameOn = false
    canPlay = false // turn off
    speedTime = speedTimeMax //reset speed!!
    document.getElementById("gameOver").style.display = "none"
    clearInterval(gameLoopInt) 
    //make home screen visible again
    document.getElementById("startGameBtn").style.display = "block"
    document.getElementById("preGame_Stuff_OuterDiv").style.display = "flex"
    //document.getElementById("exitGameBtn").style.display = "none"

    //update worldIDDiv
    document.getElementById("worldIDDiv").style.display = "none"
    
    /* Hide leave game icon btn*/
    document.getElementById("exitGameIconBtn").style.display = "none"
    /************ CLEAR EVENT LISTENERS *********************/
    document.removeEventListener("keydown", keydown)
    document.removeEventListener("keyup", keyup)
    document.removeEventListener("mousemove", mousemove)
    document.removeEventListener("mousedown", mousedown)
    document.removeEventListener("mouseup", mouseup)
    // (for mobile)
    document.removeEventListener("touchstart", touchstart)
    document.removeEventListener("touchend", touchend)
}
socket.on("noWorld", ()=>{
    console.log("no world...")
    exitGame()
})
socket.on("gameOver", ()=>{
    // DEATH MESSAGE update found in the game loop search: [A4dh3dfDM9]
    console.log("Game over :(")

    //remove all event listeners
    document.removeEventListener("keydown", keydown)
    document.removeEventListener("keyup", keyup)
    document.removeEventListener("mousemove", mousemove)
    document.removeEventListener("mousedown", mousedown)
    document.removeEventListener("mouseup", mouseup)
    document.removeEventListener("touchstart", touchstart)
    document.removeEventListener("touchend", touchend)
    //document.getElementById("exitGameBtn").style.display = "block"
    document.getElementById("gameOver").style.display = "flex"

    //reset variables
    speedTime = speedTimeMax //reset speed!!
    keySet = {} // reset keySet
    mapOff = true
    //close dem
    if(marketOpen) toggleMarket()

    /**Hide game divs */
    document.getElementById("inGame_Stuff").style.display = "none"

    gameOn = false
})


/***********************************************/

var lastHealthBeforeMarket; // Keep track of health. If lower then, close market
window.toggleMarket = function toggleMarket(){
    let market = document.getElementById("market")
    let marketBackground = document.getElementById("marketBackground")
    let marketBtn = document.getElementById("showMarketBtn")
    //close market page
    if (market.style.display != "none"){
        lastHealthBeforeMarket = null
        market.style.display = "none"
        marketBtn.innerHTML = "Market"
        marketBackground.style.display = "none" //background display
        marketOpen = false
    }
    //open market page
    else{
        lastHealthBeforeMarket = player.health
        market.style.display = "flex"
        marketBackground.style.display = "block" //background display
        marketBtn.innerHTML = "Close"
        createMarketBtn(holdableItems)
        marketOpen = true
    }
}
function createMarketBtn(items, xxxp=player.xp) {
    var table = document.getElementById("marketBtnContainer"); 
    table.innerHTML = ''; 
   // table.style.top = 0

    var market = document.getElementById("market")
    market.style.top = invSize + 15
    market.style.height = ginfo.height - ((invSize + 15) + (gBarHeight * 3) + 15) //15 for padding
    let k = 1
    Object.entries(items).forEach(([key, value]) => {
        if(value.inMarket && value.cost){ //if Infinity then, null.
            var row = table.insertRow(); 
            if(k%2==0){
                row.style.backgroundColor = "#2b2b2b"
            }else{
                row.style.backgroundColor = "#444"
            }
            var cell1 = row.insertCell();
            var cell2 = row.insertCell();
            var cell3 = row.insertCell();
            var cell4 = row.insertCell();
            var cell5 = row.insertCell();
            var cell6 = row.insertCell();

            //CELL 1 -- IMAGE
            var img = document.createElement('img');
            img.src = value.imgSrc;
            img.alt = value.name;
            cell1.appendChild(img);
            cell1.setAttribute('class', 'marketBtnImgs'); 

            //CELL 2 -- NAME
            cell2.innerHTML = value.name
            cell2.setAttribute('class', 'marketBtnText'); 

            //CELL 3 -- COST
            cell3.innerHTML = `COST: <b>${value.cost}</b> XP`
            cell3.setAttribute('class', 'marketBtnText');

            //CELL 4 -- DAMAGE
            var text = value.damage?`+<b><span style="color:red"> ${value.damage}</span></b> Damage`:""
            cell4.innerHTML = text
            cell4.setAttribute('class', 'marketBtnText'); 

            //CELL 5 -- DURABILITY
            var text = value.durability?`${value.durability} Durability`:""
            cell5.innerHTML = text
            cell5.style.color = "green"; 

            //CELL 6 -- BUY BTN
            var buyBtn = document.createElement('button');
            let id = `marketBuyBtnFor${key}`
            buyBtn.textContent = 'Buy';
            buyBtn.onclick = function(){
               buy(value, id)
            }
            if(!xxxp || xxxp < value.cost){
                buyBtn.style.backgroundColor = "#777"
                buyBtn.style.color = "#aaa"
            } else{
                buyBtn.style.backgroundColor = "007bff"
                buyBtn.style.color = "white"
            }
            cell6.appendChild(buyBtn);
            cell6.setAttribute('class', 'buyBtn');
            cell6.setAttribute('id', id);
            
            k++
        } 
    });
}
function buy(boughtItem, btnID){
    if(player.xp >= boughtItem.cost){
        socket.emit("buy", {
            item:boughtItem,
            id: player.id,
            worldID: player.worldID
        })
    }
}
socket.on("bought!", (data)=>{
    createMarketBtn(holdableItems, data.newXp)
}) //reupdate table after buying

/************* @WAIT_SCREEN (SERVER LOADING...) ************/
// WAIT SCREEN on
const waitDiv = document.getElementById("wait")
const dotsSpan = document.getElementById('dots');
const dotsCount = 3; // Number of dots to display
let dotIndex = 0;
var disconnectTimeout
/************ @CONNECTED ***********************************/
socket.on('connect', () => {
    console.log('Connected to server');
    // Clear the timeout if the connection is established
    if(disconnectTimeout) clearTimeout(disconnectTimeout);
    // Hide the "wait" div when connected
    waitDiv.style.display = 'none';
});
// Disconnected...
socket.on("disconnect", ()=>{
    console.log('Disconnected from server');
    waitDiv.style.display = 'block';
    disconnectTimeout = setInterval(addDot, 1000);
})

function addDot() {
    if (dotIndex < dotsCount) {
        dotsSpan.textContent += '.';
        dotIndex++;
    } else {
        dotsSpan.textContent = ""
        dotIndex = 0
    }
}

/********************************************************/
// Detect when the user is leaving the page
window.addEventListener('beforeunload', function(event) {
    if(gameOn) event.preventDefault()
    let stillPlaying = gameOn?confirm("Are you sure you want to leave?"):false
    console.log(gameOn, stillPlaying)
    if (stillPlaying) {
        socket.emit("playerClosedTab", {
            player:player,
            worldID:player.worldID
        })
        return null;
    } 
})


window.leaveGame = function leaveGame(){
    let goOrNot = confirm("Are you sure you want to leave? Your inventory, xp, and progress will not be saved.")
    if(goOrNot){
        socket.emit("playerClosedTab", {
            worldID: player.worldID,
            player: player
        })
        exitGame()
    }
}
