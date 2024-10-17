function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const elementsToAnalyze = document.querySelectorAll('p, h1, h2, h3, div');
let sensitivity = 0.5; 
let protectionEnabled = false; 
const rateLimit = 1;
let totalTextLength=0;

async function analyzeElements() {
    totalTextLength=0;
    if (!protectionEnabled) {
        elementsToAnalyze.forEach(element => {
            element.style.filter = 'none';
            element.setAttribute('aria-hidden', 'false');
        });
        return;
    }

    for (let i = 0; i < elementsToAnalyze.length; i++) {
        const element = elementsToAnalyze[i];
        const elementText = element.innerText.trim();
        totalTextLength += elementText.length;
        console.log("Texte envoyé pour analyse : ", elementText);

        try {
            const response = await fetch('https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=AIzaSyAexXtPA33bp0hNSS3X_j30X3UhdCZ4u3I', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    comment: { text: elementText },
                    languages: ['fr'],
                    requestedAttributes: { TOXICITY: {} }
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur lors de la requête :${response.statusText}`);
            }

            const data = await response.json();
            const toxicityScore = data.attributeScores.TOXICITY.summaryScore.value;
            console.log('toxicity score: ',toxicityScore);
            console.log(`Score de TOXICITÉ pour l'élément "${elementText.substring(0, 50)}..." : ${toxicityScore}`);

            if (toxicityScore > sensitivity) {
                console.log("flouté");
                element.style.filter = 'blur(5px)';
                element.setAttribute('aria-hidden', 'true');
            } else {
                console.log("non flouté");
                element.style.filter = 'none';
                element.setAttribute('aria-hidden', 'false');
            }
        } catch (error) {
            console.error('Erreur lors de l\'analyse du contenu :', error);
        }

        if ((i + 1) % rateLimit === 0) {
            await delay(1000);
        }
    }
    console.log(totalTextLength);
    chrome.runtime.sendMessage({ type: "updateTextLength", length: totalTextLength });
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "updateSensitivity") {
        sensitivity = message.sensitivity;
        console.log("Sensibilité mise à jour :", sensitivity);
        analyzeElements(); 
    } else if (message.type === "toggleProtection") {
        protectionEnabled = message.enabled;
        analyzeElements(); 
    }
});

chrome.storage.sync.get(["sensitivity", "protectionEnabled"], function (data) {
    sensitivity = data.sensitivity || 0.5;
    protectionEnabled = data.protectionEnabled || false;
    analyzeElements();
});
