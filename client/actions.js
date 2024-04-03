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
var marketsList = []

var helpOpen = false //
var marketOpen = false //


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
    marketsList = data.markets
    holdables = data.holdables
})
socket.on("reupdate", (data)=>{
    borders = data.bordersObj
    walls = data.structuresObj
    mapSize = data.mapSize
    entitySize = data.entitySize
    canPlay = true
    updateAgain = true
    wallsList = data.walls
    marketsList = data.markets
})


/** @UPDATE !! */
//DRAWING FUNCTION
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
            let username = item.username;
            let width = ctx.measureText(username).width * 1.6 //to fill entire space (width of rect)
            let x = -width/1.4; //to get aligned with center
            let y = entitySize;
            let fontSize = 24;

            // Draw background
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(x - 5, y - fontSize + 5, width * 1.5 + 10, fontSize + 10);

            // Draw text
            ctx.font = `${fontSize}px Arial`;
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
        gSpeedBar()
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
//UPDATECANV DRAWING FUNCTION RUN WHEN INFO SENT FROM SERVER
socket.on("sendUpdateDataToClient", (info)=>{
    //dont send data if dead
    let savedInv
    if(reorder) savedInv = player.inventory
    if(player.health > 0) {
        player = info.player
        if(reorder) player.inventory = savedInv
    }
    updateCanv(info.updateContent, info.serverPlayerCount, info.leaderboard)
    wallsList = info.structures
})


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
    gctx.font = `${fontSize}px Verdana`
    gctx.fillText (`HEALTH ${Math.round(player.health)}`, 0, canvas.height-height+fontSize)
}
var xpImg = new Image()
xpImg.src = "/imgs/XP.png"
function gXP(){
    let padding = 5
    let size = gBarHeight
    gctx.drawImage(xpImg, padding, canvas.height-size * 3 - padding, size, size)
    gctx.fillStyle = 'white'
    gctx.font = `${gBarHeight * 3/4}px Verdana`
    gctx.fillText (`XP ${player.xp}`, size + padding, canvas.height-size * 3 - padding + size)
}
var speedTime = 0
var speedTimeMax = 100
socket.on("speed", ()=>{speedTime+=100})
function gSpeedBar(){
    if(speedTime > 0){ 
        //just making sure...
        if(speedTime > speedTimeMax) {speedTime = speedTimeMax}
        //set
        player.speed = 10 //[yS%^++]
        //now...
        let width = canvas.width - 15
        let height = gBarHeight
        gctx.fillStyle = 'black'
        gctx.fillRect(0, canvas.height-height * 2, width, height - 15)
        //
        gctx.fillStyle = "rgb(146, 236, 246)"
        gctx.fillRect(0, canvas.height-height * 2, width * (speedTime/speedTimeMax), height - 15) //[###]
        //
        gctx.fillStyle = 'white'
        gctx.font = `10px Verdana`
        gctx.fillText(`SPEED: ${Math.round(speedTime)}`, 0, canvas.height-height * 2+height-2 - 15)
        // 
        speedTime -= 0.1
        if(speedTime <= 0){
            player.speed = 5 //[yS%^]
        }
    } else{
        player.speed = 5  //[yS%^]
    } 
}
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
//this is the little circle that appears...where you hit 
function gAttackCursor(){
    if(mouse.x**2 + mouse.y**2 <= player.hitRange ** 2){
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

    gctx.font = `${(canvas.width/4)/10<20?(canvas.width/4)/10:20}px Verdana` //fontSize but "5" bigger (in ratio)
    gctx.fillText("Leaderboard", x, y - padding)

    y += fontSize + padding // Adjusted y position for the first leaderboard entry

    gctx.font = `${fontSize}px Verdana`
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
    gctx.font = `${fontSize}px Verdana`
    gctx.fillText(text, x, y-padding)
}
function gMap(){
    let size = canvas.height * 1/6 //added pIcSize to balance out offset
    let sf = size/mapSize //scale factor
    let pIcSize = (n)=>n*sf
    let x = 0
    let y = canvas.height - gBarHeight * 3.5 - size

    //background
    gctx.fillStyle = "#000000aa"
    gctx.fillRect(x,y,size+pIcSize(player.width),size+pIcSize(player.height))
    gctx.lineWidth = 2.5
    gctx.strokeStyle = "#ffffffaa"
    gctx.strokeRect(x,y,size+pIcSize(player.width),size+pIcSize(player.height))
    
    //structures + markets
    gctx.save()
    gctx.translate(x+size/2,y+size/2)
    //draw markets
    for(let i in marketsList){
        let market = marketsList[i]
        gctx.fillStyle = "#1E90FF"
        gctx.fillRect(market.x*sf,market.y*sf,pIcSize(market.width),pIcSize(market.height))
    }
    //draw walls
    for(let i in wallsList){
        let wall = wallsList[i]
        if(wall.class == "Wall") {gctx.fillStyle = "gray"}
        else {gctx.fillStyle = "green"}
        gctx.fillRect(wall.x*sf,wall.y*sf,pIcSize(wall.width),pIcSize(wall.height))
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
        gctx.font = `bold ${fontSize}px Trebuchet MS`;

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

// "invSize" also updated in the canvas resize 
var invSize = 75*5<window.innerWidth?75:window.innerWidth/5 //5 bc of slots
var invY = 0
var reorder = false; 
function drawInventory(){
    let i = 0
    gctx.fillStyle = "#000000aa"
    gctx.fillRect(0, 0, invSize * player.inventory.length, invSize)
    gctx.save()
    for(let invSpot in player.inventory){
        let each = player.inventory[invSpot]
        gctx.lineWidth = invSize * 10/75;
        gctx.strokeStyle = "gray"
        gctx.strokeRect(i * invSize, invY, invSize, invSize)
        //draw pic
        if(each.pic){
            if(!images[each.pic]){
                images[each.pic] = new Image()
                images[each.pic].src = each.pic
            }
            gctx.drawImage(images[each.pic], i * invSize, invY, invSize, invSize)
        }
        if(each.durability < each.maxDurability){
            let w = invSize
            let h = 5
            let x = i * invSize
            let y = invSize - h*3
            gctx.fillStyle = "black"
            gctx.fillRect(x, y, w, h)
            gctx.fillStyle = "rgb(0,235,0)"
            gctx.fillRect(x, y, w * (each.durability/each.maxDurability), h)
        }  

        //if stackable give it a number to show how many you have
        if(each.maxStackSize > 1){
            gctx.font = `15px Arial`;
            gctx.fillStyle = "white";
            gctx.fillText(each.stackSize, i * invSize + invSize * 0.75, invSize -15); //minus fontSize
        }

        i++ //x 
    }
    gctx.restore()
    //selected
    gctx.lineWidth = invSize * 10/75;
    gctx.strokeStyle = "white"
    gctx.strokeRect(currInvSlot * invSize, invY, invSize, invSize)
}

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
function keydown(event){
    event.preventDefault()
    event.stopPropagation()
    //inventory
    switch(event.key.toLowerCase()){
        case " ":
            tx = -Math.cos(player.rotation) * player.speed
            ty = -Math.sin(player.rotation) * player.speed
            break
        case "w":
        case "arrowup":
            ty = -player.speed
            break
        case "a":
        case "arrowleft":
            tx = -player.speed
            break
        case "s":
        case "arrowdown":
            ty = player.speed
            break
        case "d":
        case "arrowright":
            tx = player.speed
            break
        case "1":
            currInvSlot = 1 - 1
            break
        case "2":
            currInvSlot = 2 - 1
            break
        case "3":
            currInvSlot = 3 - 1
            break
        case "4":
            currInvSlot = 4 - 1
            break   
        case "5":
            currInvSlot = 5 - 1
            break
        case "q":
            socket.emit("drop", {
                playerInvI:currInvSlot,
                x:player.x - Math.cos(player.rotation) * entitySize * 2,
                y:player.y - Math.sin(player.rotation) * entitySize * 2,
            })
            break
    }
    // Check if Ctrl key is pressed and either + or - is pressed
    if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '-')) {
        // Prevent the default zoom behavior
        event.preventDefault();
    }
}
function keyup(event){
    event.preventDefault()
    event.stopPropagation()
    switch(event.key.toLowerCase()){
        case " ":
            tx = 0
            ty = 0
            break
        case "w":
        case "arrowup":
            ty = 0
            break
        case "a":
        case "arrowleft":
            tx = 0
            break
        case "s":
        case "arrowdown":
            ty = 0
            break
        case "d":
        case "arrowright":
            tx = 0 
            break
    }
}

var dragStartX = 0;
var dragStartY = 0;
var draggedItemIndex = -1;
var lastEnteredSlot = -1; // Track the last inventory slot entered by the mouse

function mousemove(e) {
    // calculate the mouse position relative to the canvas center
    mouse.x = e.clientX - canvas.width / 2;
    mouse.y = e.clientY - canvas.height / 2;

    if (!reorder || draggedItemIndex === -1) return;

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
        if (player.health > 0 && !clickedInv) {
            socket.emit("mousedown", {
                x: mouse.x + player.x,
                y: mouse.y + player.y
            });
        }
    }

    let mouseX = e.clientX - canvas.getBoundingClientRect().left;
    let mouseY = e.clientY - canvas.getBoundingClientRect().top;

    // Check if the mouse click is within an inventory slot
    let clickedItemIndex = Math.floor(mouseX / invSize);
    if (clickedItemIndex >= 0 && clickedItemIndex < player.inventory.length && mouseY <= invSize) {
        reorder = true
        dragStartX = mouseX;
        dragStartY = mouseY;
        draggedItemIndex = clickedItemIndex;
        draggedItem = player.inventory[clickedItemIndex]; // Store the dragged item
        lastEnteredSlot = clickedItemIndex; // Update the last entered slot
    }
}
function mouseup(e) {
    if (!reorder || draggedItemIndex === -1) return;
    draggedItemIndex = -1;
    reorder = false;
}

var touching = false
function touchstart(e){
    if(!marketOpen){
        tx = -Math.cos(player.rotation) * player.speed
        ty = -Math.sin(player.rotation) * player.speed
        touching = true
    }
}
function touchend(e){
    if(!marketOpen){
        tx = 0
        ty = 0
        touching = false
    }
}
//Function also in APP js file~! But different
//HIT WALLS?
function checkCollision(walls, playerX, playerY, tx, ty, onWall) {
    if(onWall) return {tx:tx, ty:ty}
    let newX = playerX + tx;
    let newY = playerY + ty;
    for (let wall of walls) {
        if(wall.class == "Wall"){
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
    }
    return { tx: tx, ty: ty};
}

/** @update */
//request data to update canv
var updateAgain = false
//in some unhappy circumstances, allow update to restart
socket.on("allowUpdate", ()=>{updateAgain = true})
var gameLoopInt // TO BE THE GAME LOOPA!
//also contains the game loop
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
                    if(wall.class == "Stairs"
                    && player.x > wall.x-wall.width/2 && player.x < wall.x+wall.width/2
                    && player.y > wall.y-wall.height/2 && player.y < wall.y+wall.height/2
                    && !player.onWall){
                        oW = true;
                        break;
                    } else if(player.onWall){
                        if((wall.class == "Wall" || wall.class == "Stairs")
                        && player.x > wall.x-wall.width/2 && player.x < wall.x+wall.width/2
                        && player.y > wall.y-wall.height/2 && player.y < wall.y+wall.height/2) {
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
                checkCollision(wallsList,player.x, player.y, tx, ty, player.onWall)
                tx = newCoords.tx
                ty = newCoords.ty

                player.x += tx
                player.y += ty
                player.invSelected = currInvSlot
                player.rotation = (Math.atan2(mouse.y, mouse.x)) + Math.PI
                socket.emit("updatePlayer", {
                    player:player,
                    reorder:reorder
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
            } 
            socket.emit("requestUpdateDataFromServer", {
                id: player.id,
                x:player.x,
                y:player.y,
            }) //gives data to draw  
            updateAgain = false  
        }
        
    }, 0.01)
}
function exitGame(){
    canPlay = false // turn off
    document.getElementById("gameOver").style.display = "none"
    clearInterval(gameLoopInt) 
    //make home screen visible again
    document.getElementById("startGameBtn").style.display = "block"
    document.getElementById("preGame_Stuff").style.display = "block"
    document.getElementById("exitGameBtn").style.display = "none"
}

//show game over screen if dead
socket.on("gameOver", ()=>{
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
    speedTime = 0 //reset speed!!
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
function openMarket(){
    let market = document.getElementById("market")
    let marketBackground = document.getElementById("marketBackground")
    let marketBtn = document.getElementById("showMarketBtn")
    if (market.style.display != "none"){
        market.style.display = "none"
        marketBtn.innerHTML = "Market"
        marketBackground.style.display = "none" //background display
        marketOpen = false
    }
    else{
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

/*
// Detect when the user is leaving the page
window.addEventListener('beforeunload', function(event) {
    var stillPlaying = confirm("You are still playing the game. Are you sure you want to leave?");
    if (stillPlaying) {
        return null;
    } else {
        event.preventDefault();
        return event.returnValue = 'Are you sure you want to leave?';
    }
});*/

//WAIT SCREEN on
const waitDiv = document.getElementById("wait")
const dotsSpan = document.getElementById('dots');
const dotsCount = 3; // Number of dots to display
let dotIndex = 0;
var disconnectTimeout
//reconnected
socket.on('connect', () => {
    console.log('Connected to server');
    // Clear the timeout if the connection is established
    if(disconnectTimeout) clearTimeout(disconnectTimeout);
    // Hide the "wait" div when connected
    waitDiv.style.display = 'none';
});
//disconnected
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