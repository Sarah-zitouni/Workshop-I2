function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const elementsToAnalyze = document.querySelectorAll('p, h1, h2, h3, div');

const rateLimit = 5;

async function analyzeElements() {
    chrome.storage.sync.get('sensitivity', async function (data) {
        const sensitivity = data.sensitivity || 0.5;

        for (let i = 0; i < elementsToAnalyze.length; i++) {
            const element = elementsToAnalyze[i];
            const elementText = element.innerText.trim();

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
                    throw new Error(`Erreur lors de la requête : ${response.statusText}`);
                }

                const data = await response.json();
                const toxicityScore = data.attributeScores.TOXICITY.summaryScore.value;

                console.log(`Score de TOXICITÉ pour l'élément "${elementText.substring(0, 50)}..." : ${toxicityScore}`);

                if (toxicityScore > sensitivity) {
                    console.log(`Floutage de l'élément suivant :`, element);
                    element.style.filter = 'blur(5px)';
                    element.setAttribute('aria-hidden', 'true');
                } else {
                    console.log(`Pas de floutage pour cet élément :`, element);
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
    });
}

analyzeElements();
