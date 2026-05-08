const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const pdf = require('pdf-parse');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors({ origin: 'http://localhost:3000' }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

const mongoURI = 'mongodb+srv://rohanrai40679:Shivani8826@cluster0.qhakv4a.mongodb.net/job_board';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch(err => console.error('Failed to connect to MongoDB:', err.message));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const runPythonScript = (scriptPath, args = []) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [scriptPath, ...args]);
        let result = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                resolve(result);
            } else {
                reject(error);
            }
        });
    });
};

const readFileContent = async (filePath, fileType) => {
    try {
        if (fileType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        } else if (fileType === 'text/plain') {
            return fs.readFileSync(filePath, 'utf-8');
        } else {
            throw new Error('Unsupported file type');
        }
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
};

app.post('/upload', upload.fields([
    { name: 'question', maxCount: 1 },
    { name: 'predefinedAnswer', maxCount: 1 },
    { name: 'handwrittenAnswer', maxCount: 10 }
]), async (req, res) => {
    try {
        console.log('Files:', req.files);

        const questionFile = req.files['question'] ? req.files['question'][0] : null;
        const predefinedAnswerFile = req.files['predefinedAnswer'] ? req.files['predefinedAnswer'][0] : null;
        const handwrittenAnswerFiles = req.files['handwrittenAnswer'] || [];

        let questionText = '';
        let predefinedAnswerText = '';
        let results = [];

        if (questionFile) {
            const questionPath = questionFile.path;
            questionText = fs.readFileSync(questionPath, 'utf-8');
        }

        if (predefinedAnswerFile) {
            const predefinedAnswerPath = predefinedAnswerFile.path;
            const predefinedAnswerType = predefinedAnswerFile.mimetype;
            predefinedAnswerText = await readFileContent(predefinedAnswerPath, predefinedAnswerType);
        }

        for (const file of handwrittenAnswerFiles) {
            const handwrittenAnswerPath = file.path;

            const extractedText = await runPythonScript('./crnn_simulator.py', [handwrittenAnswerPath]);

            const similarityResult = await runPythonScript('./similarity_calculator.py', [extractedText, predefinedAnswerText]);

            const parsedResult = JSON.parse(similarityResult);
            const { similarityScores, allocatedMarks } = parsedResult;

            const totalMarks = Object.values(allocatedMarks).reduce((a, b) => a + b, 0);

            const studentId = path.basename(file.originalname, path.extname(file.originalname));

            results.push({
                studentId,
                extractedText,
                predefinedAnswerText,
                similarityScores,
                allocatedMarks
            });
        }

        res.json({
            message: 'Files uploaded and processed successfully',
            results
        });

    } catch (error) {
        console.error('Error during processing:', error);
        res.status(500).json({ error: 'An error occurred during file processing' });
    }
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    } else if (err) {
        return res.status(500).json({ error: 'An unknown error occurred.' });
    }
    next();
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
