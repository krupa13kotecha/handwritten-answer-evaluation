const segmentText = (text, type) => {
    const segments = {};
    const lines = text.split('\n').filter(line => line.trim() !== '');

    let currentQuestion = null;
    let currentAnswer = null;

    if (type === 'handwritten') {
        lines.forEach(line => {
            if (line.startsWith('Q')) {
                currentQuestion = line;
            } else if (line.startsWith('H')) {
                currentAnswer = line;
            }

            if (currentQuestion && currentAnswer) {
                const questionKey = 'Q1';  // Assuming single question for simplicity
                segments[questionKey] = currentAnswer;
                currentQuestion = null;
                currentAnswer = null;
            }
        });
    } else if (type === 'predefined') {
        lines.forEach(line => {
            if (line.startsWith('A')) {
                const [key, answer] = line.split(':').map(part => part.trim());
                segments[key] = answer;
            }
        });
    }

    return segments;
};

module.exports = segmentText;
