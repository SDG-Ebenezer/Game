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

function showHelp(){
    let help = document.getElementById("help")
    if (help.style.display == "block"){
        help.style.display = "none"
    }
    else{
        help.style.display = "block"
    }
}
//
function showSettings(){
    let settings = document.getElementById("settings")
    if (settings.style.display == "block"){
        settings.style.display = "none"
    }
    else{
        settings.style.display = "block"
    }
}

//copy on click
document.getElementById("worldIDDiv").addEventListener("click", function() {
    navigator.clipboard.writeText(document.getElementById("worldIDSpan").textContent)
    document.getElementById("worldIDCopySuccessDiv").style.display = "block"
    setTimeout(()=>{
        document.getElementById("worldIDCopySuccessDiv").style.display = "none"
    }, 1000)
  });
