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

//w_vars (Wait Variables)
var images = {} //loads images as needed
var borders = {}
var walls = {}
var mapSize //defined soon!
var fps

//ALL W_VARS DEFINED AFTER SERVER SENDS DATA
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
    updateAgain = true
})
//DRAWING FUNCTION
function updateCanv(info){
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save();
    ctx.translate(canvas.width/2 - player.x, canvas.height/2 - player.y);
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
                ctx.fillStyle= "red"
                let x= -item.width/2
                let y= -item.height/2
                let holdingIconSize = 50
                ctx.translate(x,y)
                ctx.rotate(-45/57.1)
                ctx.fillRect(0,0,10,10)
                ctx.drawImage(images[pic],-25,-25,holdingIconSize,holdingIconSize)
                ctx.strokeRect(-25,-25,holdingIconSize,holdingIconSize)
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

        //console.log(player.inventory)
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
    if(player.health > 0){
        updateHealth()
        updateXPBar()
        speedBar()
        shadow()
        drawInventory()
    }
    updateAgain = true//allow update
}
//UPDATECANV DRAWING FUNCTION RUN WHEN INFO SENT FROM SERVER
socket.on("sendUpdateDataToClient", (info)=>{
    //dont send data if dead
    if(player.health > 0) player = info.player 
    updateCanv(info.updateContent)
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
/** */
var invSize = 75
function drawInventory(){
    let i = 0
    ctx.fillStyle = "#000000aa"
    ctx.fillRect(0, 0, invSize * player.inventory.length, invSize)
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
        i++ 
    }
    //selected
    gctx.lineWidth = 15;
    gctx.strokeStyle = "white"
    gctx.strokeRect(player.invSelected * invSize, 0, invSize, invSize)
    
}

/*
function wallCheck(xinc, yinc, x, y){
    for(let w in walls){
        let wall = walls[w]
        //console.log(wall)
        let borderRadius = 0
        if(y+entitySize-borderRadius > wall.y 
        && y-entitySize+borderRadius < wall.y+wall.height){
            if((xinc > 0 && wall.x+wall.width > x+xinc+entitySize 
            && x+xinc+entitySize > wall.x) || 
            (xinc < 0 && wall.x+wall.width > x+xinc-entitySize 
            && x+xinc-entitySize > wall.x)) {
                //console.log("a")
                xinc = 0
            }
        }
        if(x+entitySize-borderRadius > wall.x 
        && x-entitySize+borderRadius < wall.x+wall.width){
            if((yinc > 0 && wall.y+wall.height > y+yinc+entitySize 
            && y+yinc+entitySize > wall.y) ||
            (yinc < 0 && wall.y+wall.height > y+yinc-entitySize 
            && y+yinc-entitySize > wall.y)) {
                //console.log("b")
                yinc = 0
            }
        }
    }
    return [xinc, yinc]
}*/
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
function keydown(event){
    event.preventDefault()
    event.stopPropagation()
    let key = event.key.toLowerCase()
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key) && !pressedKeys.includes(key)) {
        pressedKeys.push(key)
        keyDown = true
    }
    let tx = 0
    let ty = 0
    if(key == " "){
            tx = -Math.cos(player.rotation) * player.speed
            ty = -Math.sin(player.rotation) * player.speed
    } else{
        pressedKeys.forEach((pkey)=>{
            if(pkey == "w" || pkey == "arrowup") ty -= player.speed
            else if(pkey == "a" || pkey == "arrowleft") tx -= player.speed
            else if(pkey == "s" || pkey == "arrowdown") ty += player.speed
            else if(pkey == "d" || pkey == "arrowright") tx += player.speed
        })
    }
    player.dx += tx
    player.dy += ty

    //KEEP PLAYER WITHIN borders
    if(player.dx < 0 && player.x+player.dx <= borders.L) {
        player.dx = 0
        player.x = borders.L
    }
    else if(player.dx > 0 && player.x+player.dx >= borders.R) {
        player.dx = 0
        player.x = borders.R
    }

    if(player.dy < 0 && player.y+player.dy <= borders.D) {
        player.dy = 0
        player.y = borders.D
    }        
    else if(player.dy > 0 && player.y+player.dy >= borders.U) {
        player.dy = 0
        player.y = borders.U
    }
    

    //inventory
    switch(event.key){
        case "1":
            player.invSelected = 1 - 1
            break
        case "2":
            player.invSelected = 2 - 1
            break
        case "3":
            player.invSelected = 3 - 1
            break
        case "4":
            player.invSelected = 4 - 1
            break   
        case "5":
            player.invSelected = 5 - 1
            break
    }
}
function keyup(event){
    let i = pressedKeys.indexOf(event.key.toLowerCase())
    if (i > -1) {
        pressedKeys.splice(i, 1)
        if (pressedKeys.length == 0) {
            keyDown = false
        }
    }
    player.dx = 0
    player.dy = 0
}
function mousemove(e){
    // calculate the mouse position relative to the canvas center
    mouse.x = e.clientX - canvas.width / 2
    mouse.y = e.clientY - canvas.height / 2
}
function mousedown(e){
    if(player.health > 0){
    socket.emit("mousedown", {
        damage:player.inventory[player.invSelected].damage,
        x:mouse.x + player.x, 
        y:mouse.y + player.y
    })}
}

/** @update */
//request data to update canv
var updateAgain = false
function gameLoop(){    
    if(player.health > 0){   
        player.x += player.dx
        player.y += player.dy
        player.rotation = (Math.atan2(mouse.y, mouse.x)) + Math.PI
        socket.emit("updatePlayer", player)  
    } 
    socket.emit("requestUpdateDataFromServer", {
        id: player.id,
        x:player.x,
        y:player.y
    }) //gives data to draw  
    updateAgain = false       
}
var gameLoopInt
function startGame(){
    //set these:
    document.getElementById("exitGameBtn").style.display = "none"
    document.getElementById("preGame_Stuff").style.display = "none"
    document.getElementById("startGameBtn").style.display = "none"
    document.getElementById("gameOver").style.display = "none"
    //adjust:
    window.addEventListener("keydown", keydown)
    window.addEventListener("keyup", keyup)
    window.addEventListener("mousemove", mousemove)
    window.addEventListener("mousedown", mousedown)
    
    //ask server for starting data and create new ID
    var selectedValue = document.getElementById("skins-image-options").querySelector("input[name='option']:checked").value;
    console.log("Selected value:", selectedValue);
    socket.emit("askForStartData", {
        username: document.getElementById("username").value,
        img:selectedValue
    })
    //start game loop
    gameLoopInt = setInterval(()=>{
        //dont update if (1) player is not existant or (2) last frame's update wasnt fully completed
        if(player.health <= 0) socket.emit("toldGameOver", player.id)
        if(player && updateAgain) {gameLoop()}
    }, fps)
}
function exitGame(){
    clearInterval(gameLoopInt) 
    //remove all event listeners
    removeEventListener("keydown", keydown)
    removeEventListener("keyup", keyup)
    removeEventListener("mousemove", mousemove)
    removeEventListener("mousedown", mousedown)
    //make home screen visible again
    document.getElementById("startGameBtn").style.display = "block"
    document.getElementById("preGame_Stuff").style.display = "block"

    document.getElementById("gameOver").style.display = "none"
}

//show game over screen if dead
socket.on("gameOver", ()=>{
    document.getElementById("exitGameBtn").style.display = "block"
    document.getElementById("gameOver").style.display = "block"
})