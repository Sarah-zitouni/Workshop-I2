const bucketName = "bucket-workshop-epsi-2024";

async function analyzeImage(imgElement, sensitivity) {
    const imageUrl = imgElement.src;
    console.log(imageUrl);
    console.log(sensitivity);


    try {
        const fileName = `temp-1.jpg`;
        await uploadImageToBucket(imageUrl, fileName);

        const gcsUri = `gs://${bucketName}/${fileName}`;
        const [result] = await visionClient.safeSearchDetection(gcsUri);
        const detections = result.safeSearchAnnotation;

        console.log("Résultats de l'analyse de l'image :", detections);

        const isSafe = analyzeImageDetections(detections, sensitivity);

        if (!isSafe) {
            blurElement(imgElement);
        } else {
            unblurElement(imgElement);
        }

        await deleteFileFromBucket(fileName);
    } catch (error) {
        console.error('Erreur lors de l\'analyse de l\'image :', error);
    }
}

async function uploadImageToBucket(imageUrl, fileName) {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const file = storage.bucket(bucketName).file(fileName);
    await file.save(new Uint8Array(buffer));
}

function analyzeImageDetections(detections, sensitivity) {
    const thresholdMap = {
        'VERY_UNLIKELY': 0.1,
        'UNLIKELY': 0.3,
        'POSSIBLE': 0.5,
        'LIKELY': 0.7,
        'VERY_LIKELY': 0.9
    };

    const categories = ['adult', 'violence', 'racy'];
    for (const category of categories) {
        if (thresholdMap[detections[category]] > sensitivity) {
            return false;
        }
    }
    return true;
}

async function deleteFileFromBucket(fileName) {
    await storage.bucket(bucketName).file(fileName).delete();
}

function blurElement(element) {
    element.style.filter = 'blur(5px)';
    element.setAttribute('aria-hidden', 'true');
}

function unblurElement(element) {
    element.style.filter = 'none';
    element.setAttribute('aria-hidden', 'false');
}

async function analyzeAllImagesOnPage(sensitivity) {
    const imgElements = document.querySelectorAll('img');

    for (const imgElement of imgElements) {
        const isSafe = await analyzeImage(imgElement, sensitivity);

        if (!isSafe) {
            blurElement(imgElement);
        } else {
            unblurElement(imgElement);
        }
    }
}


//analyzeAllImagesOnPage(0.5);

//analyzeImage("https://imgs.search.brave.com/ApbzVTxBtDqtxulYavQm-tlo5xsG0zpXb0PGGlOn5cM/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/cnVzdGljYS5mci9p/bWFnZXMvY2l0cm91/aWxsZS1lYjE1MDky/MS0wNDQtbDc5MC1o/NTI2LmpwZy53ZWJw", 0.5);