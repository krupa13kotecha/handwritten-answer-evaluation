// server.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process'); // To execute Python scripts
const pdf = require('pdf-parse'); // To parse PDF files
const cors = require('cors'); // Add CORS support

// Initialize express app
const app = express();
const port = 5000;

// Middleware for CORS
app.use(cors({
    origin: 'http://localhost:3000', // Frontend URL
}));

// Middleware for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// MongoDB connection URI
const mongoURI = 'mongodb+srv://rohanrai40679:Shivani8826@cluster0.qhakv4a.mongodb.net/job_board';

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch(err => console.error('Failed to connect to MongoDB:', err.message));

// Express middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to run Python script
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

// Function to read file content based on file type
const readFileContent = async (filePath, fileType) => {
    try {
        if (fileType === 'application/pdf') {
            // Handle PDF files
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        } else if (fileType === 'text/plain') {
            // Handle TXT files
            return fs.readFileSync(filePath, 'utf-8');
        } else {
            throw new Error('Unsupported file type');
        }
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
};

// Endpoint for file uploads and processing
app.post('/upload', upload.fields([
    { name: 'question', maxCount: 1 },
    { name: 'predefinedAnswer', maxCount: 1 },
    { name: 'handwrittenAnswer', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('Files:', req.files);

        // Process uploaded files
        const questionFile = req.files['question'] ? req.files['question'][0] : null;
        const predefinedAnswerFile = req.files['predefinedAnswer'] ? req.files['predefinedAnswer'][0] : null;
        const handwrittenAnswerFile = req.files['handwrittenAnswer'] ? req.files['handwrittenAnswer'][0] : null;

        let questionText = '';
        let predefinedAnswerText = '';
        let extractedText = '';
        let similarityScore = 0;
        let allocatedMarks = 0;

        if (questionFile) {
            const questionPath = questionFile.path;
            questionText = fs.readFileSync(questionPath, 'utf-8');
            console.log('Question file uploaded to:', questionPath);
        }

        if (predefinedAnswerFile) {
            const predefinedAnswerPath = predefinedAnswerFile.path;
            const predefinedAnswerType = predefinedAnswerFile.mimetype; // Get file type
            predefinedAnswerText = await readFileContent(predefinedAnswerPath, predefinedAnswerType);
            console.log('Predefined answer file uploaded to:', predefinedAnswerPath);
        }

        if (handwrittenAnswerFile) {
            const handwrittenAnswerPath = handwrittenAnswerFile.path;
            console.log('Handwritten answer file uploaded to:', handwrittenAnswerPath);

            // Run CRNN simulator Python script to extract text from the image
            extractedText = await runPythonScript('./crnn_simulator.py', [handwrittenAnswerPath]);
            console.log('Extracted Text from Image:', extractedText);
        }

        if (extractedText && predefinedAnswerText) {
            // Run similarity calculator Python script to calculate similarity
            const similarityResult = await runPythonScript('./similarity_calculator.py', [extractedText, predefinedAnswerText]);

            // Ensure the parsed similarity result is correctly assigned to the outer variables
            const parsedResult = JSON.parse(similarityResult);
            similarityScore = parsedResult.similarityScore;
            allocatedMarks = parsedResult.allocatedMarks;
            console.log('Similarity Score:', similarityScore);
            console.log('Allocated Marks:', allocatedMarks);
        }

        // Respond to the client with the results
        res.json({
            message: 'Files uploaded and processed successfully',
            extractedText,
            predefinedAnswerText, // Include this for completeness in the response
            similarityScore,
            allocatedMarks
        });

    } catch (error) {
        console.error('Error during processing:', error);
        res.status(500).json({ error: 'An error occurred during file processing' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
