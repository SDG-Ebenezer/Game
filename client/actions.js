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
})

var socket = io()

//player
var entitySize
var player;
var currInvSlot = 0

//w_vars (Wait Variables)
var images = {} //loads images as needed
var borders = {}
var walls = {}
var mapSize //defined soon!
var fps

//ALL W_VARS DEFINED AFTER SERVER SENDS DATA
var canPlay = false
socket.on("sendStartData", (data)=>{
    borders = data.bordersObj
    walls = data.structuresObj
    player = data.player
    mapSize = data.mapSize
    entitySize = data.entitySize
    fps = data.fps

    //player img
    var pimg = new Image()
    pimg.src = player.imgSrc
    images[player.imgSrc] = pimg 

    canPlay = true
    updateAgain = true
})
//DRAWING FUNCTION
function updateCanv(info, serverPlayerCount, leaderboard){
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save();
    if(player) ctx.translate(canvas.width/2 - player.x, canvas.height/2 - player.y);
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
            let pic = item.inventory[item.invSelected].pic
            if(pic){//hand's pic is false, so...
                if(!images[pic]){
                    images[pic] = new Image()
                    images[pic].src = pic
                }
                let x= -item.width/2
                let y= -item.height/2
                let holdingIconSize = 50
                ctx.translate(x,y)
                ctx.rotate(-45/57.1)
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
            let width = ctx.measureText(username).width
            let x = -entitySize/2 - width/2;
            let y = entitySize;
            let fontSize = 24;

            // Draw background
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(x - 5, y - fontSize + 5, width * fontSize * 0.1 + 10, fontSize + 10);

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
        updateHealth()
        updateXPBar()
        speedBar()
        shadow()
        drawInventory()
        drawAttackCursor()
        playerCountAndLeaderboard(serverPlayerCount, leaderboard)
    }
    updateAgain = true//allow update
}
//UPDATECANV DRAWING FUNCTION RUN WHEN INFO SENT FROM SERVER
socket.on("sendUpdateDataToClient", (info)=>{
    //dont send data if dead
    if(player.health > 0) {
        player = info.player
    }
    updateCanv(info.updateContent, info.serverPlayerCount, info.leaderboard)
})

/** @GAME_DETAILS */
//update the health bar
function updateHealth(){
    let width = canvas.width
    let height = 40
    gctx.fillStyle = 'black'
    gctx.fillRect(0, canvas.height-height, width, height)
    gctx.fillStyle = "rgb(120, 210, 156)"
    gctx.fillRect(0, canvas.height-height, width * (player.health/player.maxHealth), height)
    gctx.fillStyle = 'black'
    gctx.font = `20px Verdana`
    gctx.fillText (`HEALTH ${Math.round(player.health)}`, 0, canvas.height-10)
}
//read the function name ;P
var xpImg = new Image()
xpImg.src = "/imgs/XP.png"
function updateXPBar(){
    let padding = 5
    let size = 40
    gctx.drawImage(xpImg, padding, canvas.height-size * 3 - padding, size, size)
    gctx.fillStyle = 'white'
    gctx.font = `30px Verdana`
    gctx.fillText (`XP ${player.xp}`, size + padding, canvas.height-size * 3 - padding + size)
}
//update the speed bar
var speedTime = 0
function speedBar(){
    if(speedTime > 0){ //formerly showSBar, but no longer needed
        player.speed = 10 //[yS%^++]
        let width = canvas.width - 15
        let height = 40
        gctx.fillStyle = 'black'
        gctx.fillRect(0, canvas.height-height * 2, width, height - 15)
        gctx.fillStyle = "rgb(146, 236, 246)"
        gctx.fillRect(0, canvas.height-height * 2, width * (speedTime/100), height - 15) //[###]
        gctx.fillStyle = 'white'
        gctx.font = `10px Verdana`
        gctx.fillText(`SPEED: ${Math.round(speedTime)}`, 0, canvas.height-height * 2+height-2 - 15)
        // NOTE: Deletes 1 segment per second our of speedTime
        speedTime -= 0.1
        if(speedTime <= 0){
            //gctx.clearRect(0, 0, ginfo.width, ginfo.height)
            player.speed = 5 //[yS%^]
        }
    }    
}
/** @SHADOW */
function shadow(){
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
function drawAttackCursor(){
    if(mouse.x**2 + mouse.y**2 <= player.hitRange ** 2){
        let rangeCursorX = mouse.x + ginfo.width/2
        let rangeCursorY = mouse.y + ginfo.height/2
        gctx.fillStyle = "rgba(0,0,0,0.2)"
        gctx.strokeStyle = "rgba(0,0,0,0.5)"
        gctx.lineWidth = 5
        gctx.beginPath()
        gctx.arc(rangeCursorX, rangeCursorY, 20, 0, 2 * Math.PI)
        gctx.fill()
        gctx.stroke()
    }
}
//draw leaderboard and player count
function playerCountAndLeaderboard(pc, leaderboard){
    console.log(leaderboard)
    gctx.fillStyle = 'white'
    let fontSize = 15
    let padding = 10
    let x = canvas.width * 3/4
    let y = fontSize + 100  // Increased the initial y position for more space

    gctx.font = `20px Verdana`
    gctx.fillText("Leaderboard", x, y - padding)

    y += fontSize + padding // Adjusted y position for the first leaderboard entry

    gctx.font = `${fontSize}px Verdana`
    for (let i = 0; i < 5; i++) {
        gctx.fillStyle = "#000000aa"
        gctx.fillRect(x, y - fontSize - padding, canvas.width-x, fontSize + 2 * padding) // Adjusted the height of the rectangle

        if (leaderboard[i]) {
            let text = `${leaderboard[i][1]} XP  ${leaderboard[i][0]}` // Swapped the order of name and XP for better readability
            gctx.fillStyle = "white"
            gctx.fillText(text, x + padding, y - padding) // Adjusted x position for better alignment
        }
        y += fontSize + 2 * padding // Increased the vertical space between leaderboard entries
    }
    let text = `Players in server: ${pc}`
    fontSize = 10
    gctx.fillStyle = 'white'
    gctx.font = `${fontSize}px Verdana`
    gctx.fillText(text, x, y-padding)
}
//shows the player where he is
function drawMap(){}

/** */
var invSize = 75
function drawInventory(){
    let i = 0
    gctx.fillStyle = "#000000aa"
    gctx.fillRect(0, 0, invSize * player.inventory.length, invSize)
    gctx.save()
    for(let invSpot in player.inventory){
        let each = player.inventory[invSpot]
        gctx.lineWidth = 10;
        gctx.strokeStyle = "gray"
        gctx.strokeRect(i * invSize, 0, invSize, invSize)
        //draw pic
        if(each.pic){
            if(!images[each.pic]){
                images[each.pic] = new Image()
                images[each.pic].src = each.pic
            }
            gctx.drawImage(images[each.pic], i * invSize, 0, invSize, invSize)
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
            if(each.durability <= 0) socket.emit("breakTool", currInvSlot)
        }  
        i++ //x 
    }
    gctx.restore()
    //selected
    gctx.lineWidth = 15;
    gctx.strokeStyle = "white"
    gctx.strokeRect(currInvSlot * invSize, 0, invSize, invSize)
    
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

function mousemove(e){
    // calculate the mouse position relative to the canvas center
    mouse.x = e.clientX - canvas.width / 2
    mouse.y = e.clientY - canvas.height / 2
}
function mousedown(e){
    if(player.health > 0){
    socket.emit("mousedown", {
        tool:player.inventory[currInvSlot], // could be hand!
        damage:player.inventory[currInvSlot].damage,
        invSelected: currInvSlot,
        x:mouse.x + player.x, 
        y:mouse.y + player.y
    })}
}

/** @update */
//request data to update canv
var updateAgain = false
//in some unhappy circumstances, allow update to restart
socket.on("allowUpdate", ()=>{updateAgain = true})
var gameLoopInt
function startGame(){
    //reset or set these:
    tx = ty = invSelected = 0

    //set these:
    document.getElementById("exitGameBtn").style.display = "none"
    document.getElementById("preGame_Stuff").style.display = "none"
    document.getElementById("startGameBtn").style.display = "none"
    document.getElementById("gameOver").style.display = "none"
    //adjust:
    document.addEventListener("keydown", keydown)
    document.addEventListener("keyup", keyup)
    document.addEventListener("mousemove", mousemove)
    document.addEventListener("mousedown", mousedown)
    
    //ask server for starting data and create new ID
    var selectedValue = document.getElementById("skins-image-options").querySelector("input[name='option']:checked").value;
    socket.emit("askForStartData", {
        username: document.getElementById("username").value,
        img:selectedValue
    })
    //start game loop
    gameLoopInt = setInterval(()=>{
        if(player && updateAgain && canPlay) {
            if(player.health > 0){ 
                if (player.x + tx >= borders.R 
                || player.x + tx <= borders.L){
                    tx = 0
                }
                if (player.y + ty >= borders.U 
                || player.y + ty <= borders.D){
                    ty = 0
                }
                player.x += tx
                player.y += ty
                player.invSelected = currInvSlot
                player.rotation = (Math.atan2(mouse.y, mouse.x)) + Math.PI
                socket.emit("updatePlayer", player)  
            } 
            socket.emit("requestUpdateDataFromServer", {
                id: player.id,
                x:player.x,
                y:player.y,
            }) //gives data to draw  
            updateAgain = false  
        }
        
    }, 0.01) //fps)
}
function exitGame(){
    canPlay = false // turn off
    document.getElementById("gameOver").style.display = "none"
    clearInterval(gameLoopInt) 
    //remove all event listeners
    removeEventListener("keydown", keydown)
    removeEventListener("keyup", keyup)
    removeEventListener("mousemove", mousemove)
    removeEventListener("mousedown", mousedown)
    //make home screen visible again
    document.getElementById("startGameBtn").style.display = "block"
    document.getElementById("preGame_Stuff").style.display = "block"
}

//show game over screen if dead
socket.on("gameOver", ()=>{
    document.getElementById("exitGameBtn").style.display = "block"
    document.getElementById("gameOver").style.display = "block"
})

function showHelp(){
    let help = document.getElementById("help")
    let helpBtn = document.getElementById("helpBtn")
    if (help.style.display == "block"){
        help.style.display = "none"
        helpBtn.innerHTML = "HELP"
    }
    else{
        help.style.display = "block"
        helpBtn.innerHTML = "<b>X</b>"
    }
}