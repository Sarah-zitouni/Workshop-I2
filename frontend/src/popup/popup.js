document.addEventListener("DOMContentLoaded", function () {
    const toggleButton = document.getElementById("toggle-btn");
    const toxicitySlider = document.getElementById("toxicity-slider");
    const protectionStatus = document.querySelector(".protection-status");
    const totalBlockedElement = document.querySelector(".total-blocked"); 


    chrome.storage.sync.get("sensitivity", function (data) {
        console.log(data)
        const sensitivity = data.sensitivity || 0.5;
        console.log(sensitivity)
        toxicitySlider.value = sensitivity;
    });

    chrome.storage.sync.get("protectionEnabled", function (data) {
        const isEnabled = data.protectionEnabled || false;
        toggleButton.checked = isEnabled;
        updateProtectionStatus(isEnabled);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const currentTab = tabs[0];
        const url = new URL(currentTab.url);
        document.querySelector(".website").textContent = url.hostname;
    });

    toxicitySlider.addEventListener("input", function () {
        const newValue = parseFloat(this.value);
        chrome.storage.sync.set({ sensitivity: newValue }, function () {
            console.log("Niveau de toxicité mis à jour :", newValue);
        });

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { type: "updateSensitivity", sensitivity: newValue });
        });
    });

    toggleButton.addEventListener("change", function () {
        const isEnabled = this.checked;
        chrome.storage.sync.set({ protectionEnabled: isEnabled }, function () {
            console.log("État de la protection mis à jour :", isEnabled);
            updateProtectionStatus(isEnabled);
        });

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { type: "toggleProtection", enabled: isEnabled });
        });
    });

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.type === "updateTextLength") {
            // Mettre à jour l'affichage de la longueur du texte
            totalBlockedElement.textContent = `Longueur du Texte Traité : ${request.length}`;
        }
    });
    function updateProtectionStatus(isEnabled) {
        if (isEnabled) {
            protectionStatus.textContent = "La protection est activée";
            protectionStatus.classList.add("active");
            protectionStatus.classList.remove("inactive");
        } else {
            protectionStatus.textContent = "La protection est désactivée";
            protectionStatus.classList.add("inactive");
            protectionStatus.classList.remove("active");
        }
    }
});
