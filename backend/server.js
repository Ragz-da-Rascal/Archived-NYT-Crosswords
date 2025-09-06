// backend/server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors());

// GET /api/crosswords/:year/random
// Returns one random valid day JSON for that year
app.get('/api/crosswords/:year/random', (req, res) => {
    try {
        const { year } = req.params;
        const yearPath = path.join(__dirname, 'nyt_crosswords', year);

        if (!fs.existsSync(yearPath)) return res.status(404).json({ error: 'Year not found' });

        const months = fs.readdirSync(yearPath).filter(f =>
            fs.statSync(path.join(yearPath, f)).isDirectory()
        );
        if (!months.length) return res.status(404).json({ error: 'No months found' });

        const month = months[Math.floor(Math.random() * months.length)];

        const days = fs.readdirSync(path.join(yearPath, month))
            .filter(f => f.endsWith('.json'));

        if (!days.length) return res.status(404).json({ error: 'No days found' });

        const dayFile = days[Math.floor(Math.random() * days.length)];
        const filePath = path.join(yearPath, month, dayFile);

        const puzzle = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        res.json({ year, month, day: dayFile.replace('.json', ''), puzzle });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err});
    }
});


app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
