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
socket.on("sendStartData", (data) => {
    //..clear!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // Show the loading screen
    document.getElementById("loading").style.display = "flex";
    setupGame();
    document.getElementById("loading").style.zIndex = 1000;
    console.log("Loading all images...");

    let totalImgs = data.allImgs.length; // Total images to load
    let loadedImgs = 0; // Counter for loaded images
    let currentProgress = 0; // Current progress of the progress bar

    const updateProgressBar = (targetProgress) => {
        const step = 0.5; // Adjust this value to control speed (smaller = slower)
        const interval = 100; // Update interval in milliseconds

        const intervalId = setInterval(() => {
            if (currentProgress < targetProgress) {
                currentProgress += step;
                document.getElementById("loadingPercent").innerHTML = `${Math.round(currentProgress, 3)}%`
                document.getElementById("loadingRect").style.width = `calc(${currentProgress}% - 5px)`;
            } else {
                clearInterval(intervalId);
            }
        }, interval);
    };

    // Load all images
    for (let i in data.allImgs) {
        let imgSrc = `/imgs/${data.allImgs[i]}`;
        let newImg = new Image();

        // Handle when an image is fully loaded
        newImg.onload = () => {
            loadedImgs++; // Increment the loaded counter

            // Calculate target progress
            let loadImgCompletion = (loadedImgs / totalImgs) * 100;

            // Gradually update the progress bar to the target
            updateProgressBar(loadImgCompletion);

            console.log("Loaded:", imgSrc, "Progress:", loadImgCompletion);

            // When all images are loaded, proceed
            if (loadedImgs >= totalImgs) {
                setTimeout(() => {
                    document.getElementById("loading").style.display = "none"; // Hide loading screen
                    console.log("All images loaded. Initializing game...");

                    // Initialize game components
                    borders = data.bordersObj;
                    player = data.player;
                    mapSize = data.mapSize;

                    wallsList = data.walls; // Map walls
                    lakesList = data.lakes; // Map lakes
                    marketsList = data.markets; // Map markets

                    initiateGameLoop();
                    canPlay = true;
                    updateAgain = true;
                }, 2000); // Optional delay for smooth transition
            }
        };

        // Set the image source to start loading
        newImg.src = imgSrc;

        // Store the image for later use
        images[imgSrc] = newImg;

        // RESET LOADING VARS
        document.getElementById("loadingPercent").innerHTML = "0%"
        document.getElementById("loadingRect").style.width = "0"
    }
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

/******* DRAWING FUNCTION RIGHT HERE!! ************************************/
function updateCanv(info, serverPlayerCount, leaderboard){
    if(player.inventory[player.invSelected].cooldownTimer > 0){
        canSwitchInventorySlots = false
    } else{
        canSwitchInventorySlots = true
    }

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
            ctx.fillRect(-item.width/2, -item.height/2, item.width, item.height)
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
                console.log("Image NONEXISTANT!", pic)
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
        // health bar
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
            ctx.fillRect(x, y, w * (item.health/item.maxHealth>0?item.health/item.maxHealth:0), h)
            ctx.restore()
        }   

        //draw username
        if(item.type=="player"){
            // Set text properties
            ctx.save()
            ctx.translate(item.x, item.y)
            let fontSize = 24;
            ctx.font = `${fontSize}px ${defaultFontFamily}`;
            
            var text = item.username

            let width = ctx.measureText(text).width * 0.675 //to fill entire space (width of rect)
            let x = -width/1.4; //to get aligned with center
            let y = entitySize;

            // Draw background
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(x - 5, y - fontSize + 5, width * 1.5 + 10, fontSize + 10);

            // Draw text
            ctx.fillStyle = "white";
            ctx.fillText(text, x, y);
            ctx.restore()
        } 
        // bot? display kills?
        else if(item.kills 
        && document.getElementById("showKillsOnOffSlider").checked){
            // Set text properties
            ctx.save()
            ctx.translate(item.x, item.y)
            let fontSize = 24;
            ctx.font = `${fontSize}px ${defaultFontFamily}`;
            let k = "KILLS: " + item.kills;
            let width = ctx.measureText(k).width * 0.675 //to fill entire space (width of rect)
            let x = -width/1.4; //to get aligned with center
            let y = entitySize;

            // Draw background
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(x - 5, y - fontSize + 5, width * 1.5 + 10, fontSize + 10);

            // Draw text
            ctx.fillStyle = "#eee";
            ctx.fillText(k, x, y);
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
        // Update player data
        player = info.player;

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
function gMap(showBots=true){
    if(document.getElementById("mapOnOffSlider").checked == false) return

    let paddingForMapOn = 15
    let size = mapOff
            ?(canvas.height * 1/6)
            :Math.min(canvas.height, canvas.width)-paddingForMapOn -gBarHeight * 4
    let sf = size/mapSize //scale factor
    let mapSfSize = (n) => n * sf
    let x = mapOff
            ?0
            :canvas.width/2 - size/2 - paddingForMapOn/4
    let y = mapOff
            ?(canvas.height - gBarHeight * 3.5 - size)
            :canvas.height/2 - size/2 - paddingForMapOn/4

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
    if(showBots){
        for(let key in entities){
            let e = entities[key]
            if(e.enemyKey == "Boss"){
                gctx.fillStyle = "#810000" // maroon red
            } else if (e.enemyKey == "Summoned Lord"){
                gctx.fillStyle = "#00817b" //aqua marine blue
            } else{
                gctx.fillStyle = "#5e9900" //savannah green
            }
            gctx.fillRect(e.x*sf,e.y*sf,mapSfSize(100),mapSfSize(100))
        }
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
var reorderInventory = false; 
var canSwitchInventorySlots = true
// contains inventory drawing as well as item name displayer
function drawInventory(){    
    for(let ind in player.inventory){
        let slot = player.inventory[ind]
        let HTMLslotID = `slot${Number(ind) + 1}`
        let HTMLslotDiv = document.getElementById(HTMLslotID)

        //Image Source
        let HTMLslotImg = document.getElementById(`${HTMLslotID}ImgSrc`)
        if(slot.imgSrc){
            HTMLslotImg.src = slot.imgSrc
            HTMLslotImg.style.display = "block"
        } else HTMLslotImg.style.display = "none"
        
        //Durability
        let HTMLslotDurabilityBar = document.getElementById(`${HTMLslotID}Durability`)
        if(slot.name!="Hand" 
        && slot.durability < slot.maxDurability){
            HTMLslotDurabilityBar.style.display = "block"
            HTMLslotDurabilityBar.style.backgroundColor = getDurabilityColor(slot.durability, slot.maxDurability)
            HTMLslotDurabilityBar.style.width = (slot.durability/slot.maxDurability) * 100
        } else{
            HTMLslotDurabilityBar.style.display = "none"
        }

        //Cooldown bar animation
        let HTMLslotCooldown = document.getElementById(`${HTMLslotID}Cooldown`)
        if(slot.cooldownTimer > 0){
            HTMLslotCooldown.style.display = "block";
            HTMLslotCooldown.style.height = `${slot.cooldownTimer/slot.cooldownTime * 100}%`
        } else {
            HTMLslotCooldown.style.display = "none";
        }
        
        //Cooldown bar text
        let HTMLslotCooldownText = document.getElementById(`${HTMLslotID}CooldownText`)
        if(slot.cooldownTimer > 0){
            HTMLslotCooldownText.style.display = "flex";
            HTMLslotCooldownText.innerHTML = `<div>${slot.cooldownTimer}</div>`
        } else {
            HTMLslotCooldownText.style.display = "none";
        }

        //Stacksize/Quantity
        let HTMLslotQuantity = document.getElementById(`${HTMLslotID}Quantity`)
        if(slot.stackSize && slot.stackSize > 1){
            HTMLslotQuantity.innerHTML = `x${slot.stackSize}`
            HTMLslotQuantity.style.display = "block"
        } else{
            HTMLslotQuantity.style.display = "none"
        }

        //inv selected?
        if(ind == player.invSelected){
            HTMLslotDiv.style.border = "4px solid white"
        } else{
            HTMLslotDiv.style.border = "4px solid black"
        }
    }
}

//floating div
var durDiv = document.getElementById("floatingDurabilityDiv")
document.getElementById("inventory").addEventListener("mousemove", (e) => {
    let slot = e.target.closest("div[id^='slot']"); // Find the closest slot div
    if (!slot) {
        durDiv.style.display = "none"; // Hide tooltip if not over a slot
        return;
    }

    let slotId = slot.id; // Get the slot ID (e.g., "slot1")
    let i = parseInt(slotId.replace("slot", "")) - 1; // Convert to inventory index

    let tool = player.inventory[i];
    if (!tool) {
        durDiv.style.display = "none"; // Hide tooltip if slot is empty
        return;
    }
    if(tool.name == "Hand") return

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
    ${tool.durability?
    `<!--Durability-->
    <b><span style="color:${getDurabilityColor(tool.durability, tool.maxDurability)}">${tool.durability}</span>/${tool.maxDurability}</b> Durability`
    :""}

    ${tool.name=="Bow"?
        `<br><br>
        <!--Info-->
        <b><span style="color:"white">To use, HOLD attack to load</span></b>`
        :""
    }

    ${tool.cooldownTimer>0?
        `<!--Info-->
        <b><span style="color:#555">COOLDOWN</span></b>`:""
    }
    `;
    if(tool.cooldownTimer>0){
        durDiv.style.backgroundColor = "#d3d3d3aa"
    } else{
        durDiv.style.backgroundColor = "#000000aa"
    }

    durDiv.innerHTML = text;
    durDiv.style.display = "block";
    durDiv.style.left = e.pageX + 10 + "px"; // Offset tooltip slightly
    durDiv.style.top = e.pageY + 10 + "px";
});

//switch inv slots on click
document.getElementById("inventory").addEventListener("mousedown", (e) => {
    let slot = e.target.closest("div[id^='slot']"); // Find the closest slot div
    if (!slot || !canSwitchInventorySlots) {
        return;
    }

    let slotId = slot.id; // Get the slot ID (e.g., "slot1")

    let i = parseInt(slotId.replace("slot", "")) - 1; 
    
    currInvSlot = i
});
document.getElementById("inventory").addEventListener("mouseleave", () => {
    durDiv.style.display = "none"; // Hide tooltip when leaving inventory
});

//for keys, see keys function


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

// Scroll adjust for inventory
window.addEventListener("wheel", (e)=> {
    var increment = -e.deltaY/100
    if(player && !marketOpen) {
        let num = currInvSlot
        num -= increment
        if(num < 0) num = 4
        else if(num > 4) num = 0
        currInvSlot = num
    }
})

/***********************************************/
/** @MOVEMENT_CONTROLS */
/************* KEYS *************************/
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

    // switch inventory slots
    if(canSwitchInventorySlots){
        if (keySet["1"]) currInvSlot = 1 - 1;
        if (keySet["2"]) currInvSlot = 2 - 1;
        if (keySet["3"]) currInvSlot = 3 - 1;
        if (keySet["4"]) currInvSlot = 4 - 1;
        if (keySet["5"]) currInvSlot = 5 - 1;
    }

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
function mousemove(e) {    
    // calculate the mouse position relative to the canvas center
    mouse.clientX = e.clientX
    mouse.clientY = e.clientY // raw forms 0,0 = top corner
    mouse.x = e.clientX - canvas.width / 2;
    mouse.y = e.clientY - canvas.height / 2;
}

//is mouse down and still down?
var holding = null
var holdDuration = 1
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
        if (player.health > 0 
            && player.inventory[player.invSelected].cooldownTimer <= 0
            && attackCursorOn
            && player.inventory[player.invSelected].name !== "Bow"
        ){// Check if not in cooldown
            //EMIT MOUSE DOWN EVENT (function performed in APP.Js (server-side))
            emitMousedownEvent()
        }
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
    //reset holding vars
    if(holding){
        if(e.target.tagName.toLowerCase() !== 'button'
        && player.health > 0 
        && player.inventory[player.invSelected].cooldownTimer <= 0){
            socket.emit("mouseup", {
                holdDuration:holdDuration,
                id:player.id,
                worldID: player.worldID
            })
        }
        holdDuration = 0
        clearInterval(holding)
    }
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
        console.log("Game ID: ", value)
    }

    startGame(value)
}
window.createNewWorld = function createNewWorld(){
    //create ID
    let st = ""
    for(let i = 0; i < 6; i ++){
        st += String(random(9, 0))
    }
    console.log("New Game ID String:", st)
    startGame(st, true)
}
window.gameOn = false
function startGame(worldID = "Main", createWorld=false, username=null, worldSize=1000, botCount=null, lakeCount=null, structureCount=null, marketCount=null){
    /*****************************************************/
    //ask server for starting data and create new ID
    var selectedValue = document.getElementById("skins-image-options").querySelector("input[name='option']:checked").value
    console.log("World ID = ", worldID)
    socket.emit("askForStartData", {
        username: username?username:document.getElementById("username").value,
        img:selectedValue,
        worldID:worldID, //WORLD THAT THE PLAYER JOINS
        createWorldData:{
            wantToCreateWorld:createWorld,
            worldSize:worldSize,
            botCount:botCount,
            lakeCount:lakeCount,
            structureCount:structureCount,
            marketCount:marketCount
        },
    })//start game loop

    //Actual stuff called when server responds.
}
// Starts the game loop
function initiateGameLoop(){
    gameLoopInt = setInterval(()=>{
        //player update
        if(player && updateAgain && canPlay) {
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
                let possibleNewXY = checkCollision(player.id, obstacles, lakesList, player.x, player.y, tx, ty, player.onWall, null, true, player.width, player.height, player.worldID, entities)
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
    console.log("Rejoin WORLDID: ", player.worldID)
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

    ctx.clearRect(0, 0, canvas.width, canvas.height)
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
function createMarketBtn(items, xxxp=player.xp?player.xp:0) {
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
    waitDiv.style.display = 'flex';
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
    if(gameOn) {
        event.preventDefault()
        if (confirm("Are you sure you want to leave?")) {
            socket.emit("playerClosedTab", {
                player:player,
                worldID:player.worldID
            })
            return null;
        } 
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