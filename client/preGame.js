/**
 * 
 * THIS JS DOCUMENT DEALS WITH THE PREGAME ELEMENTS
 * 
 */
var toggleImageOptionsDivOn = true
var initialImg = (str)=>`<img id=\"showcase_skin\" class=\"skins_imgs rot90deg\" src=\"/client/imgs/${str}.png\">`
function toggleSkinsImageOptionsDiv(){
    let div = document.getElementById("skins-image-options")
    let openBtn = document.getElementById("change_skin_btn")
    let closeBtn = document.getElementById("change_skin_close_btn")
    if(toggleImageOptionsDivOn){
        openBtn.style.display = "none"
        div.style.display = "block"
        closeBtn.style.display = "block"
        toggleImageOptionsDivOn = false
    } else{
        openBtn.style.display = "block"
        div.style.display = "none"
        closeBtn.style.display = "none"
        let selectedValue = document.getElementById("skins-image-options").querySelector("input[name='option']:checked").value
        document.getElementById("change_skin_btn").innerHTML = initialImg(selectedValue) + "Change Skin"

        toggleImageOptionsDivOn = true
    }
}
//startGame(document.getElementById("join_game_input"))
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