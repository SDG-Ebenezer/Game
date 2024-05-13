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
    createMarketBtn(holdables)

    scale = (Math.min(window.innerHeight, window.innerWidth)/8)/75
    maxScale = scale
    minScale = maxScale - 0.2
})

var socket = io()
var defaultFontFamily = window.getComputedStyle(document.body).fontFamily;
var random = (max, min) => Math.floor(Math.random() * (max - min + 1)) + min

//player
var entitySize
var player;
var currInvSlot = 0

//w_vars (Wait Variables)
var images = {} //loads images as needed
var borders = {}
var walls = {} //all of the walls
var holdables = {} //all things that you can hold
var mapSize //defined soon!
var wallsList = [] //only the values
var lakesList = []
var marketsList = []

var helpOpen = false //
var marketOpen = false //

var speedFactor = 1 //updated later, 1 as default

//ALL W_VARS DEFINED AFTER SERVER SENDS DATA
var canPlay = false
socket.on("sendStartData", (data)=>{
    borders = data.bordersObj
    walls = data.structuresObj
    player = data.player
    mapSize = data.mapSize
    entitySize = data.entitySize

    //player img
    var pimg = new Image()
    pimg.src = player.imgSrc
    images[player.imgSrc] = pimg 

    canPlay = true
    updateAgain = true

    wallsList = data.walls
    lakesList = data.lakes
    marketsList = data.markets
    holdables = data.holdables

    speedFactor = data.speedFactor
})
socket.on("reupdate", (data)=>{
    borders = data.bordersObj
    walls = data.structuresObj
    mapSize = data.mapSize
    entitySize = data.entitySize
    canPlay = true
    updateAgain = true
    wallsList = data.walls
    lakesList = data.lakes
    marketsList = data.markets
    speedFactor = data.speedFactor
})


/** @UPDATE !! */
// DRAWING FUNCTION
var scale = (Math.min(window.innerHeight, window.innerWidth)/8)/75
var maxScale = scale
var minScale = maxScale - 0.2
function updateCanv(info, serverPlayerCount, leaderboard){
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save();

    //scale
    if(player.onWall){
        if(scale>minScale){scale-=0.05}//transition effect
    }
    else{
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
            //create a loaded image if not existant
            if(!images[item.imgSrc]){
                images[item.imgSrc] = new Image()
                images[item.imgSrc].src = item.imgSrc
            }
            ctx.rotate(item.rotation)
            ctx.drawImage(images[item.imgSrc], -item.width/2, -item.height/2, item.width, item.height)
        }
        //draw held item
        if(item.inventory){
            let heldItem = item.inventory[item.invSelected]
            let pic;
            //if held is a bow, make it loaded if has arrow (the picture)
            if(heldItem.name == "Bow"){
                item.inventory.forEach(invSlot=>{
                    if(invSlot.name == "Arrow"){pic = heldItem.loadedBowPic}
                })
                if(!pic){pic = heldItem.pic}
            } else pic = heldItem.pic
            //when pic is defined...(hand has no pic)
            if(pic){//hand's pic is false, so...
                if(!images[pic]){
                    images[pic] = new Image()
                    images[pic].src = pic
                }
                let x= -item.width/2
                let y= -item.height/2
                let holdingIconSize = 50
                ctx.translate(x,y)
                ctx.rotate(heldItem.rotation)
                if(false){ //debug
                    ctx.fillStyle= "red"
                    ctx.fillRect(0,0,10,10)
                    ctx.strokeRect(-25,-25,holdingIconSize,holdingIconSize)
                }
                ctx.drawImage(images[pic],-25,-25,holdingIconSize,holdingIconSize)
                
            }
        }
        ctx.restore() 
        
        //SHOW HEALTH (formerly showHealth() method)
        if(item.health < item.maxHealth && item.showH){
            let x = -item.width/2
            let y = -entitySize *3/4
            let w = 50
            let h = 10
            ctx.save()
            ctx.translate(item.x, item.y)
            ctx.fillStyle = "black"
            ctx.fillRect(x, y, w, h)
            ctx.fillStyle = "rgb(0,235,0)"
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

        //eat!
        if(player && item.type=="pickable" 
        && Math.abs(item.x - player.x) < entitySize/2
        && Math.abs(item.y - player.y) < entitySize/2){
            socket.emit("eat", {
                who:player,
                what:item
            })
        }
        
    })
    ctx.restore();

    //game data
    gctx.clearRect(0, 0, ginfo.width, ginfo.height)
    //dont show if player dead
    if(player && player.health > 0){
        gHealth()
        gXP()
        gActivateSpeedBar()
        gShadow()
        drawInventory()
        gAttackCursor()
        gShowCountdown()
        //close if market is open
        if(!marketOpen){
            gLeaderboardData(serverPlayerCount, leaderboard)
            gMap()
        }
    }
    updateAgain = true//allow update
}
// UPDATECANV DRAWING FUNCTION RUN WHEN INFO SENT FROM SERVER
socket.on("sendUpdateDataToClient", (info) => {
    // Don't update data if the player is dead
    if (player.health > 0) {
        // Save the current inventory if needed
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
    }
    /** @Note
     * The updateCanv function is outside of the "player.health > 0"
     * condition in order for a "spectator" view to be allowed after
     * death.
     */
    updateCanv(info.updateContent, info.serverPlayerCount, info.leaderboard);
});

/** @GAME_DETAILS */
var gBarHeight = window.innerHeight * 40/847 //also in resize
function gHealth(){
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
        let imgWidth = imgHeight = spCircleRadius; 
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

    if(displayHelp){
        let x = ginfo.width / 2
        let y = ginfo.height - gBarHeight * 2
        let w = 500
        let h = 40
        // Draw translucent white background
        gctx.save()
        gctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        gctx.fillRect(x - w/2, y - h/2, w, h);

        // Draw text
        gctx.fillStyle = "black";
        gctx.font = `${h / 2}px ${defaultFontFamily}`
        gctx.textAlign = "center";
        gctx.fillText("Hold a Key and then Press [X] to Sprint", x , y);
        gctx.restore()
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

function gShadow(){
    let radius = canvas.width > canvas.height ? canvas.width : canvas.height
    let startAngle = Math.PI / 4
    let endAngle = -startAngle
    let sectorColor = "#0000009a"
    let rad = Math.atan2(mouse.y, mouse.x)
    ctx.save()
    ctx.translate(ginfo.width/2, ginfo.height/2)
    ctx.rotate(rad) 
    ctx.beginPath();
    ctx.fillStyle = sectorColor; 
    ctx.arc(0,0, radius, startAngle, endAngle);
    ctx.lineTo(-entitySize * 4, 0); //center of arc
    ctx.fill(); 
    ctx.closePath();
    ctx.restore()
}
// This is the little circle that appears...where you hit 
function gAttackCursor(){
    let hitRange = (player.inventory[player.invSelected].hitRange? player.inventory[player.invSelected].hitRange:entitySize) * scale
    if(mouse.x**2 + mouse.y**2 <= hitRange ** 2){
        let rangeCursorX = mouse.x + ginfo.width/2
        let rangeCursorY = mouse.y + ginfo.height/2
        gctx.fillStyle = "rgba(0,0,0,0.2)"
        gctx.strokeStyle = "rgba(0,0,0,0.5)"
        gctx.lineWidth = 5
        gctx.beginPath()
        gctx.arc(rangeCursorX, rangeCursorY, player.hitSize/2, 0, 2 * Math.PI)
        gctx.fill()
        gctx.stroke()
    }
}
function gLeaderboardData(pc, leaderboard){
    gctx.fillStyle = 'white'
    let fontSize = (canvas.width/4)/15<15?(canvas.width/4)/15:15
    let padding = 10
    let x = canvas.width/4>200?canvas.width-200:canvas.width * 3/4
    let y = fontSize + 100  // Increased the initial y position for more space

    gctx.font = `${(canvas.width/4)/10<20?(canvas.width/4)/10:20}px ${defaultFontFamily}` //fontSize but "5" bigger (in ratio)
    gctx.fillText("Leaderboard", x, y - padding)

    y += fontSize + padding // Adjusted y position for the first leaderboard entry

    gctx.font = `${fontSize}px ${defaultFontFamily}`
    for (let i = 0; i < 5; i++) {
        gctx.fillStyle = "#000000aa"
        gctx.fillRect(x, y - fontSize - padding, canvas.width-x, fontSize + 2 * padding) // Adjusted the height of the rectangle

        if (leaderboard[i]) {
            let text = `${leaderboard[i].kills} Kills  ${leaderboard[i].username}`
            if(leaderboard[i].id == player.id) gctx.fillStyle = "gold"
            else gctx.fillStyle = "white"
            gctx.fillText(text, x + padding, y - padding)
        }
        y += fontSize + 2 * padding // Increased the vertical space between leaderboard entries
    }
    let text = `Players in server: ${pc}`
    fontSize = 10
    gctx.fillStyle = 'white'
    gctx.font = `${fontSize}px ${defaultFontFamily}`
    gctx.fillText(text, x, y-padding)
}
var mapOff = true
function gMap(){
    let paddingForMapOn = 15
    let size = mapOff?(canvas.height * 1/6):Math.min(canvas.height, canvas.width)-paddingForMapOn //added pIcSize to balance out offset
    let sf = size/mapSize //scale factor
    let pIcSize = (n)=>n*sf
    let x = mapOff?0:canvas.width/2 - size/2 - paddingForMapOn/4
    let y = mapOff?(canvas.height - gBarHeight * 3.5 - size):canvas.height/2 - size/2 - paddingForMapOn/4

    //background
    gctx.fillStyle = "#000000dd"
    gctx.fillRect(x,y,size+pIcSize(player.width),size+pIcSize(player.height))
    gctx.lineWidth = 2.5
    gctx.strokeStyle = "#ffffffaa"
    gctx.strokeRect(x,y,size+pIcSize(player.width),size+pIcSize(player.height))
    
    //structures + markets
    gctx.save()
    gctx.translate(x+size/2,y+size/2)
    
    
    //draw lakes
    for(let i in lakesList){
        let lake = lakesList[i]
        gctx.fillStyle = "#188B8F"
        gctx.beginPath();
        gctx.arc(lake.x * sf, lake.y * sf, lake.size * sf, 0, Math.PI * 2, true);
        gctx.closePath();
        gctx.fill();
    }
    //draw walls
    for(let i in wallsList){
        let wall = wallsList[i]
        if(wall.class == "Wall") {gctx.fillStyle = "gray"}
        else {gctx.fillStyle = "green"}
        gctx.fillRect(wall.x*sf,wall.y*sf,pIcSize(wall.width),pIcSize(wall.height))
    }
    //draw markets
    for(let i in marketsList){
        let market = marketsList[i]
        gctx.fillStyle = "#1E90FF"
        gctx.fillRect(market.x*sf,market.y*sf,pIcSize(market.width),pIcSize(market.height))
    }

    gctx.restore()

    gctx.save()
    gctx.translate(x+size/2,y+size/2)
    gctx.fillStyle = "red"
    gctx.fillRect(player.x*sf,player.y*sf,pIcSize(100),pIcSize(100))
    gctx.restore()
}

var respawnTime = null
function gShowCountdown() {
    socket.emit("GetCountdownInfo")
    if (respawnTime) {
        let fontSize = 20
        gctx.font = `bold ${fontSize}px ${defaultFontFamily}`;

        let pad = 15
        let x = pad
        let y = invSize + fontSize + pad

        gctx.fillStyle = "white";
        gctx.fillText("Boss respawning in ", x, y);

        if(respawnTime <= 5) gctx.fillStyle = "red"; //5s red text warning
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
function drawInventory(){
    gctx.fillStyle = "#000000aa"
    gctx.fillRect(0, 0, invSize * player.inventory.length, invSize)
    gctx.save()
    for(let invSpot in player.inventory){
        let each = player.inventory[invSpot]
        let strokeWidth = invSize * 10/75 //how thick the inv slot is
        //outline // invSelected
        //PICTURE of icon (if any)
        if(each.pic){
            if(!images[each.pic]){
                images[each.pic] = new Image()
                images[each.pic].src = each.pic
            }
            gctx.drawImage(images[each.pic], invSpot * invSize, invY, invSize, invSize)
        }
        //DURABILITY bar
        if(each.durability < each.maxDurability){
            let w = invSize - strokeWidth * 2
            let h = 5
            let x = invSpot * invSize + strokeWidth
            let y = invSize - h*3
            gctx.fillStyle = "#353535"
            gctx.fillRect(x, y, w, h)
            gctx.fillStyle = "rgb(0,235,0)"
            gctx.fillRect(x, y, w * (each.durability/each.maxDurability), h)
        }  
        //SHADED out if timer on
        let timerPercentage = each.cooldownTimer/each.cooldownTime
        gctx.fillStyle = "#ffffffaa"
        gctx.fillRect(invSpot * invSize - strokeWidth/2, invY + invSize, invSize, -(invSize - strokeWidth) * timerPercentage)

        //OUTLINE
        gctx.lineWidth = strokeWidth;
        gctx.strokeStyle = "gray"
        gctx.strokeRect(invSpot * invSize, invY, invSize, invSize)

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
    gctx.strokeRect(currInvSlot * invSize, invY, invSize, invSize)
}
socket.on("giveInventoryItemCooldownTime", function(data){
    if(player.health > 0){
        let selectedTool = player.inventory[data.id];
        // Set attack cooldown status
        player.inventory[data.id].cooldownTimer = selectedTool.cooldownTime // add cooldown time
    }
})

/** @MOVEMENT_CONTROLS */
//KEYS
var keyDown = false
var pressedKeys = []
var mouse = {
    x: 0, 
    y: 0, 
}
//defined when game starts
// these are what each event listener will do
var tx = ty = 0
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
        socket.emit("drop", {
            playerInvI: currInvSlot,
            x: player.x - Math.cos(player.rotation) * entitySize * 2,
            y: player.y - Math.sin(player.rotation) * entitySize * 2,
        });
        delete keySet["q"] //drop 1 only!
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
        tx = Math.cos(player.rotation + Math.PI) * player.speed;
        ty = Math.sin(player.rotation + Math.PI) * player.speed;
    } else { // If movement keys are pressed, handle movement
        tx = (keySet["d"] || keySet["arrowright"]) ? player.speed : (keySet["a"] || keySet["arrowleft"]) ? -player.speed : 0;
        ty = (keySet["s"] || keySet["arrowdown"]) ? player.speed : (keySet["w"] || keySet["arrowup"]) ? -player.speed : 0;
    }
}

// Drag functions 
var dragStartX = 0;
var dragStartY = 0;
var draggedItemIndex = -1;
var lastEnteredSlot = -1; // Track the last inventory slot entered by the mouse

function mousemove(e) {
    // calculate the mouse position relative to the canvas center
    mouse.x = e.clientX - canvas.width / 2;
    mouse.y = e.clientY - canvas.height / 2;

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
                player.inventory.splice(draggedItemIndex, 1, {...holdables["Hand"]});
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
function mousedown(e) {
    // cannot switch inv while help open, cannot attack
    // also, cannot activate when pressing btns
    if (!helpOpen && e.target.tagName.toLowerCase() !== 'button') {
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
        if (player.health > 0 && !clickedInv 
        && player.inventory[player.invSelected].cooldownTimer == 0){// Check if not in cooldown
            // Emit attack event
            socket.emit("mousedown", {
                x: mouse.x + player.x,
                y: mouse.y + player.y,
                invID: player.invSelected
            });
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
function mouseup(e) {
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
//Function also in APP js file~! But different
//HIT WALLS?
function checkCollision(walls, playerX, playerY, tx, ty, onWall, size=entitySize) {
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
    if (!onWall) {
        for (let l in lakesList) {
            let lake = lakesList[l];
            let distanceSquared = Math.pow(lake.x - playerX, 2) + Math.pow(lake.y - playerY, 2);
            if (distanceSquared <= Math.pow(lake.radius, 2)) {
                    socket.emit("addParticles", {
                        id:player.id,
                        x:player.x,
                        y:player.y,
                    })
                return { tx: tx * lake.decreaseSpeedFactor, ty: ty * lake.decreaseSpeedFactor };
            }
        }
    }
    
    return { tx, ty };
}

/** @Update */
// Request data to update canv
var updateAgain = false
socket.on("allowUpdate", ()=>{updateAgain = true})
var gameLoopInt // TO BE THE GAME LOOPA! (currently undefined)
// Function startGame() contains the game loop
function startGame(){
    {
        //zoom in spawn effect
        scale -= 0.25
        //reset or set these:
        tx = ty = invSelected = 0
        //set these:
        document.getElementById("exitGameBtn").style.display = "none"
        document.getElementById("preGame_Stuff").style.display = "none"
        document.getElementById("startGameBtn").style.display = "none"
        document.getElementById("gameOver").style.display = "none"
        //begin listening
        document.addEventListener("keydown", keydown)
        document.addEventListener("keyup", keyup)
        document.addEventListener("mousemove", mousemove)
        document.addEventListener("mousedown", mousedown)
        document.addEventListener("mouseup", mouseup)
        //for mobile
        document.addEventListener("touchstart", touchstart)
        document.addEventListener("touchend", touchend)
        
        //ask server for starting data and create new ID
        var selectedValue = document.getElementById("skins-image-options").querySelector("input[name='option']:checked").value;
        socket.emit("askForStartData", {
            username: document.getElementById("username").value,
            img:selectedValue
        })
    }
    //start game loop
    gameLoopInt = setInterval(()=>{
        //player update
        if(player && updateAgain && canPlay) {
            if(player.health > 0){ 
                performActions() //get tx,ty from keys
                //close market if attacked
                if(lastHealthBeforeMarket > player.health) openMarket()
                //check if in border
                if (player.x + tx >= borders.R 
                || player.x + tx <= borders.L){
                    tx = 0
                }
                if (player.y + ty >= borders.U 
                || player.y + ty <= borders.D){
                    ty = 0
                }

                //update onWall
                let oW = false
                for(let w in wallsList){
                    let wall = wallsList[w]
                    let width = player.width/2
                    let height = player.height/2
                    if(wall.class == "Stairs"
                    && player.x > wall.x-wall.width/2 
                    && player.x < wall.x+wall.width/2
                    && player.y > wall.y-wall.height/2
                    && player.y < wall.y+wall.height/2
                    && !player.onWall){
                        oW = true;
                        break;
                    } else if(player.onWall){
                        if((wall.class == "Wall" || wall.class == "Stairs")
                        && player.x > wall.x-wall.width/2-width 
                        && player.x < wall.x+wall.width/2+width
                        && player.y > wall.y-wall.height/2-height 
                        && player.y < wall.y+wall.height/2+height) {
                            oW = true
                            break;
                        }
                    }
                }
                player.onWall = oW

                //check if hit wall
                let newCoords = this.onWall?
                {
                    tx:player.x+tx, 
                    ty:player.y+ty,
                }:
                checkCollision(wallsList,player.x, player.y, tx, ty, player.onWall, player.width==player.height?player.width:Math.max(player.width, player.height))
                tx = newCoords.tx
                ty = newCoords.ty

                player.x += tx
                player.y += ty
                player.invSelected = currInvSlot
                player.rotation = (Math.atan2(mouse.y, mouse.x)) + Math.PI
                socket.emit("updatePlayer", {
                    player:player,
                    reorder: reorderInventory
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
                //Update death message ONLY IF IT EXISTS [A4dh3dfDM9]
                if(player.deathMessage) document.getElementById("deathMessageText").innerHTML = player.deathMessage
            }
            socket.emit("requestUpdateDataFromServer", {
                id: player.id,
                x:player.x,
                y:player.y,
            }) //gives data to draw  
            updateAgain = false  
        }
    }, 0.01) //0.01
}
function exitGame(){
    canPlay = false // turn off
    document.getElementById("gameOver").style.display = "none"
    clearInterval(gameLoopInt) 
    //make home screen visible again
    document.getElementById("startGameBtn").style.display = "block"
    document.getElementById("preGame_Stuff").style.display = "flex"
    document.getElementById("exitGameBtn").style.display = "none"
}

// Show game over screen if dead
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
    document.getElementById("exitGameBtn").style.display = "block"
    document.getElementById("gameOver").style.display = "block"

    //reset variables
    speedTime = speedTimeMax //reset speed!!
    keySet = {} // reset keySet
    //close dem
    if(helpOpen) showHelp() 
    if(marketOpen) openMarket()
})

function showHelp(){
    let help = document.getElementById("help")
    let helpBtn = document.getElementById("helpBtn")
    if (help.style.display == "block"){
        help.style.display = "none"
        helpBtn.innerHTML = "HELP"
        helpOpen = false
    }
    else{
        help.style.display = "block"
        helpBtn.innerHTML = "<b>X</b>"
        helpOpen = true
    }
}
var lastHealthBeforeMarket; // Keep track of health. If lower then, close market
function openMarket(){
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
        createMarketBtn(holdables)
        marketOpen = true
    }
}
function createMarketBtn(items) {
    var table = document.getElementById("marketBtnContainer"); 
    table.innerHTML = ''; 
   // table.style.top = 0

    var market = document.getElementById("market")
    market.style.top = invSize + 15
    market.style.height = ginfo.height - ((invSize + 15) + (gBarHeight * 3) + 15) //15 for padding
    let k = 1
    Object.entries(items).forEach(([key, value]) => {
        if(value.cost){ //if Infinity then, null.
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

            var img = document.createElement('img');
            img.src = value.pic;
            img.alt = value.name;
            cell1.appendChild(img);
            cell1.setAttribute('class', 'marketBtnImgs'); 

            var name = document.createTextNode(value.name);
            cell2.appendChild(name);
            cell2.setAttribute('class', 'marketBtnText'); 

            var cost = document.createTextNode(`${value.cost} XP`);
            cell3.appendChild(cost);
            cell3.setAttribute('class', 'marketBtnText'); 

            var buyBtn = document.createElement('button');
            let id = `marketBuyBtnFor${key}`
            buyBtn.textContent = 'Buy';
            buyBtn.onclick = function(){buy(value, id)}
            /*if(player.xp < value.cost){
                buyBtn.style.backgroundColor = "red"
            } else{*/
                buyBtn.style.backgroundColor = "007bff"
            //}
            cell4.appendChild(buyBtn);
            cell4.setAttribute('class', 'buyBtn');
            cell4.setAttribute('id', id);
            
            /***** */
            k++
        } 
    });
}
function buy(boughtItem, btnID){
    if(player.xp >= boughtItem.cost){
        socket.emit("buy", {item:boughtItem})
    }
}

// Detect when the user is leaving the page
window.addEventListener('beforeunload', function(event) {
    socket.emit("playerClosedTab", {player})
    /*
    var stillPlaying = confirm("You are still playing the game. Are you sure you want to leave?");
    if (stillPlaying) {
        return null;
    } else {
        event.preventDefault();
        return event.returnValue = 'Are you sure you want to leave?';
    }*/
})

// WAIT SCREEN on
const waitDiv = document.getElementById("wait")
const dotsSpan = document.getElementById('dots');
const dotsCount = 3; // Number of dots to display
let dotIndex = 0;
var disconnectTimeout
// Reconnected
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

// Function to add a dot
function addDot() {
    if (dotIndex < dotsCount) {
        dotsSpan.textContent += '.';
        dotIndex++;
    } else {
        dotsSpan.textContent = ""
        dotIndex = 0
    }
}