// backend/server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors({
    origin: ["http://127.0.0.1:5500", "https://yourusername.github.io"]
}));

// GET /api/crosswords/:year/random
// Returns one random valid day JSON for that year
app.get('/api/crosswords/:year/random', (req, res) => {
    try {
        // Extract year from URL parameters
        const year = req.params.year;

        // Construct path to the year's directory
        const yearPath = path.join(__dirname, 'nyt_crosswords', year);

        // Check if year exists
        if (!fs.existsSync(yearPath)) {
            return res.status(404).json({ error: 'Year not found' });
        }

        // Get all months in the year directory
        const months = fs.readdirSync(yearPath).filter(function (f) {
            return fs.statSync(path.join(yearPath, f)).isDirectory();
        });

        if (months.length === 0) {
            return res.status(404).json({ error: 'No months found' });
        }

        // Pick a random month
        const monthIndex = Math.floor(Math.random() * months.length);
        const month = months[monthIndex];

        // Get all puzzle JSON files in the selected month
        const monthPath = path.join(yearPath, month);
        const dayFiles = fs.readdirSync(monthPath).filter(function (f) {
            return f.endsWith('.json');
        });

        if (dayFiles.length === 0) {
            return res.status(404).json({ error: 'No days found' });
        }

        // Pick a random day file
        const dayIndex = Math.floor(Math.random() * dayFiles.length);
        const dayFile = dayFiles[dayIndex];

        // Read and parse the puzzle JSON
        const filePath = path.join(monthPath, dayFile);
        const puzzle = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Return the result
        res.json(
            {
                year: year,
                month: month,
                day: dayFile.replace('.json', ''),
                puzzle: puzzle
            });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});



app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
