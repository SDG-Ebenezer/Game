/**
 * 
 * THIS JS DOCUMENT DEALS WITH THE PREGAME ELEMENTS
 * 
 */
var toggleImageOptionsDivOn = true;
var initialImg = (str) => `<img id="showcase_skin" class="skins_imgs rot90deg" src="/client/imgs/${str}.png">`;

function toggleSkinsImageOptionsDiv() {
    let div = document.getElementById("skins-image-options");
    let openBtn = document.getElementById("change_skin_btn");
    let closeBtn = document.getElementById("change_skin_close_btn");
    if (!div || !openBtn || !closeBtn) return; // Prevent errors if elements are missing

    if (toggleImageOptionsDivOn) {
        openBtn.style.display = "none";
        div.style.display = "block";
        closeBtn.style.display = "block";
        toggleImageOptionsDivOn = false;
    } else {
        openBtn.style.display = "block";
        div.style.display = "none";
        closeBtn.style.display = "none";
        let selectedInput = div.querySelector("input[name='option']:checked");
        if (selectedInput) {
            let selectedValue = selectedInput.value;
            openBtn.innerHTML = initialImg(selectedValue) + "Change Skin";
        }
        toggleImageOptionsDivOn = true;
    }
}

function showHelp() {
    let help = document.getElementById("help");
    if (!help) return;
    help.style.display = (help.style.display === "block") ? "none" : "block";
}

function showSettings() {
    let settings = document.getElementById("settings");
    if (!settings) return;
    settings.style.display = (settings.style.display === "block") ? "none" : "block";
}

// copy on click
const worldIDDiv = document.getElementById("worldIDDiv");
const worldIDSpan = document.getElementById("worldIDSpan");
const worldIDCopySuccessDiv = document.getElementById("worldIDCopySuccessDiv");
if (worldIDDiv && worldIDSpan && worldIDCopySuccessDiv) {
    worldIDDiv.addEventListener("click", function () {
        navigator.clipboard.writeText(worldIDSpan.textContent);
        worldIDCopySuccessDiv.style.display = "block";
        setTimeout(() => {
            worldIDCopySuccessDiv.style.display = "none";
        }, 1000);
    });
}
