const express = require('express');
const { Storage } = require('@google-cloud/storage');
const vision = require('@google-cloud/vision');
const gm = require('gm').subClass({ imageMagick: true });
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const storage = new Storage();
const inputBucket = storage.bucket('bucket-workshop-epsi-input-2024');
const outputBucket = storage.bucket('bucket-workshop-epsi-2024');

const visionClient = new vision.ImageAnnotatorClient();

app.use(express.json({ limit: '50mb' }));
app.use(cors());

app.post('/upload-image', async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ message: 'Aucune image envoyée' });
        }

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const destinationFilename = 'image_temp.jpg';

        console.log("Démarrage de l'upload de l'image...");
        await uploadToBucket(buffer, destinationFilename);
        console.log("Upload terminé");

        const gcsUri = `gs://bucket-workshop-epsi-input-2024/${destinationFilename}`;
        console.log("Analyse de l'image via Google Vision avec URI:", gcsUri);

        const { isToxic } = await analyzeImageForToxicity(gcsUri);

        if (isToxic) {
            console.log('Image jugée toxique, floutage en cours...');

            const localInputPath = path.join(__dirname, 'temp', destinationFilename);
            const localOutputPath = path.join(__dirname, 'temp', `blurred_${destinationFilename}`);

            console.log("Téléchargement de l'image pour floutage...");
            await inputBucket.file(destinationFilename).download({ destination: localInputPath });
            console.log("Téléchargement terminé");

            await blurImage(localInputPath, localOutputPath);

            const blurredBuffer = fs.readFileSync(localOutputPath);
            const blurredFile = outputBucket.file(`blurred_${destinationFilename}`);
            await blurredFile.save(blurredBuffer, {
                metadata: {
                    contentType: 'image/jpeg',
                }
            });

            console.log(`Image floutée téléchargée dans le bucket de sortie sous le nom blurred_${destinationFilename}`);
            res.status(200).json({ message: 'Image floutée et téléchargée dans le bucket de sortie' });
        } else {
            console.log('Image jugée non toxique');
            res.status(200).json({ message: 'Image jugée non toxique, aucune modification nécessaire.' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur lors du traitement de l\'image.');
    }
});

async function uploadToBucket(buffer, destinationFilename) {
    try {
        console.log(`Début de l'upload de l'image sous le nom ${destinationFilename}`);

        const file = inputBucket.file(destinationFilename);

        console.log("Préparation pour l'upload dans Google Cloud Storage...");

        await file.save(buffer, {
            metadata: {
                contentType: 'image/jpeg',
            }
        });

        console.log(`Image téléchargée dans GCS sous le nom ${destinationFilename}`);

    } catch (error) {
        console.error('Erreur lors de l\'upload dans GCS:', error);
        throw error;
    }
}


async function analyzeImageForToxicity(gcsUri) {
    try {
        const [result] = await visionClient.safeSearchDetection(gcsUri);
        const detections = result.safeSearchAnnotation;

        console.log('Résultats SafeSearch:', detections);

        const isToxic = detections.adult === 'LIKELY' || detections.violence === 'LIKELY';

        return { isToxic, detections };
    } catch (err) {
        console.error('Erreur lors de l\'analyse de l\'image avec Google Vision:', err);
        throw err;
    }
}

async function blurImage(inputFilePath, outputFilePath) {
    return new Promise((resolve, reject) => {
        gm(inputFilePath)
            .blur(7, 3) // Ajustez les paramètres de floutage si nécessaire
            .write(outputFilePath, (err) => {
                if (err) return reject(err);
                console.log(`Image floutée et sauvegardée sous le nom ${outputFilePath}`);
                resolve();
            });
    });
}

app.listen(port, () => {
    console.log(`Serveur en écoute sur le port ${port}`);
});
