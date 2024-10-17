const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const vision = require('@google-cloud/vision');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');

// Configurer Google Cloud Storage
const storage = new Storage();
const inputBucket = storage.bucket('bucket-workshop-epsi-input-2024');
const outputBucket = storage.bucket('bucket-workshop-epsi-2024');
const visionClient = new vision.ImageAnnotatorClient();

// Configurer multer pour gérer les uploads d'images
const upload = multer({ dest: 'uploads/' });

// Endpoint pour uploader une image depuis le frontend
app.use(cors());
app.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const fileName = path.basename(req.file.originalname);
        const gcsFileName = `uploads/${fileName}`;

        // Uploader l'image dans le bucket d'entrée
        await inputBucket.upload(filePath, {
            destination: gcsFileName,
        });

        // Vérifier la toxicité avec l'API Vision (ou attendre que Cloud Function floute)
        const [result] = await visionClient.safeSearchDetection(`gs://${inputBucket.name}/${gcsFileName}`);
        const detections = result.safeSearchAnnotation;

        const isOffensive = detections.adult === 'LIKELY' || detections.adult === 'VERY_LIKELY';
        if (isOffensive) {
            console.log(`${fileName} a été détecté comme inapproprié.`);

            // Attendre que l'image soit floutée dans le bucket de sortie
            const blurredFileName = `blurred-${fileName}`;
            const outputFile = outputBucket.file(blurredFileName);

            // Attendre que l'image floutée soit présente
            const [exists] = await outputFile.exists();
            if (exists) {
                // Récupérer l'image floutée du bucket de sortie
                const downloadPath = `./downloads/${blurredFileName}`;
                await outputFile.download({ destination: downloadPath });

                // Envoyer l'image floutée au frontend
                res.sendFile(downloadPath);
            } else {
                res.status(202).send('L\'image est en cours de floutage, veuillez réessayer.');
            }
        } else {
            res.status(200).send('L\'image est jugée appropriée, pas de floutage nécessaire.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur lors du traitement de l\'image.');
    }
});

app.listen(port, () => {
    console.log(`Serveur en écoute sur le port ${port}`);
});
