const pageText = document.body.innerText;

chrome.storage.sync.get('sensitivity', function (data) {
    const sensitivity = data.sensitivity || 0.5;

    fetch('https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=AIzaSyAexXtPA33bp0hNSS3X_j30X3UhdCZ4u3I', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            comment: { text: pageText },
            languages: ['fr'],
            requestedAttributes: { TOXICITY: {} }
        })
    })
        .then(response => response.json())
        .then(data => {
            const toxicityScore = data.attributeScores.TOXICITY.summaryScore.value;
            console.log('Score de TOXICITÉ :', toxicityScore);

            if (toxicityScore > sensitivity) {
                document.body.style.filter = 'blur(5px)';
                document.body.setAttribute('aria-hidden', 'true');
            }  else {
                document.body.style.filter = 'none';
                document.body.setAttribute('aria-hidden', 'false');
            }
        })
        .catch(error => console.error('Erreur lors de l\'analyse du contenu :', error));
});
