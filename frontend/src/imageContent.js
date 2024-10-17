const apiUrl = 'http://localhost:3000/upload-image';
const sensitivity = 0.5;

async function analyzeImage(imgElement) {
    const imageUrl = imgElement.src;

    const response = await fetch(imageUrl);
    const blob = await response.blob();

    const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve(reader.result);
        }
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    console.log(base64Image);

    try {
        const formData = new FormData();
        formData.append('imageBase64', base64Image);
        console.log(formData);

        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            if (result.isOffensive) {
                blurElement(imgElement);
            } else {
                unblurElement(imgElement);
            }
        } else {
            console.error('Erreur lors de l\'analyse de l\'image côté serveur');
        }
    } catch (error) {
        console.error('Erreur lors de l\'analyse de l\'image :', error);
    }
}

function blurElement(element) {
    element.style.filter = 'blur(5px)';
    element.setAttribute('aria-hidden', 'true');
}

function unblurElement(element) {
    element.style.filter = 'none';
    element.setAttribute('aria-hidden', 'false');
}

async function analyzeAllImagesOnPage() {
    const imgElements = document.querySelectorAll('img');

    for (const imgElement of imgElements) {
        await analyzeImage(imgElement);
    }
}

analyzeAllImagesOnPage();