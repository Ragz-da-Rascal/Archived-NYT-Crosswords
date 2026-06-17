// backend/server.js
const express = require("express");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("path");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
app.use(express.json()); // needed for POST bodies

// Stripe setup (use your Secret Key here)
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Enable CORS
const allowedOrigins = [
    "http://127.0.0.1:5500",                // local dev
    "https://ragz-da-rascal.github.io"     // GitHub Pages root
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS: " + origin));
        }
    },
    credentials: true,
    methods: ['GET', 'POST'],
    optionsSuccessStatus: 200
}));

/* ------------------------------
   Crossword Endpoint 
-------------------------------- */

app.get("/api/crosswords/:year/random", async (request, response) => {
    try {
        const requestedYear = request.params.year;

        if (!/^\d{4}$/.test(requestedYear)) {
            return response.status(400).json({
                error: "Year must be a four-digit number",
            });
        }

        const requestedYearFolderPath = path.join(
            __dirname,
            "nyt_crosswords",
            requestedYear
        );

        let monthFolderEntries;

        try {
            monthFolderEntries = await fsPromises.readdir(
                requestedYearFolderPath,
                {
                    withFileTypes: true,
                }
            );
        } catch (error) {
            if (error.code === "ENOENT") {
                return response.status(404).json({
                    error: `No crossword data was found for ${requestedYear}`,
                });
            }

            throw error;
        }

        const monthFolders = monthFolderEntries.filter((entry) =>
            entry.isDirectory()
        );

        const availablePuzzleFiles = [];

        for (const monthFolder of monthFolders) {
            const monthFolderPath = path.join(
                requestedYearFolderPath,
                monthFolder.name
            );

            const monthFolderContents = await fsPromises.readdir(monthFolderPath, {
                withFileTypes: true,
            });

            const puzzleFilesInMonth = monthFolderContents.filter((entry) => {
                return entry.isFile() && entry.name.endsWith(".json");
            });

            for (const puzzleFile of puzzleFilesInMonth) {
                availablePuzzleFiles.push({
                    month: monthFolder.name,
                    day: path.basename(puzzleFile.name, ".json"),
                    filePath: path.join(monthFolderPath, puzzleFile.name),
                });
            }
        }

        if (availablePuzzleFiles.length === 0) {
            return response.status(404).json({
                error: `No crossword puzzles were found for ${requestedYear}`,
            });
        }

        const randomPuzzleIndex = Math.floor(
            Math.random() * availablePuzzleFiles.length
        );

        const selectedPuzzleFile =
            availablePuzzleFiles[randomPuzzleIndex];

        const selectedPuzzleFileContents = await fsPromises.readFile(
            selectedPuzzleFile.filePath,
            "utf8"
        );

        const selectedPuzzle = JSON.parse(selectedPuzzleFileContents);

        return response.json({
            year: requestedYear,
            month: selectedPuzzleFile.month,
            day: selectedPuzzleFile.day,
            puzzle: selectedPuzzle,
        });
    } catch (error) {
        console.error("Failed to select random crossword:", error);

        return response.status(500).json({
            error: "Failed to load a random crossword puzzle",
        });
    }
});

/* ------------------------------
   Stripe Donation Endpoint
-------------------------------- */
// POST /api/donate
app.post("/api/donate", express.json(), async (req, res) => {
    try {
        const { value } = req.body;

        // validate amount
        const amount = Math.round(parseFloat(value) * 100);
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Invalid amount" });
        }

        // create checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"], // includes Apple Pay / Google Pay
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Donation",
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            success_url: "https://ragz-da-rascal.github.io/Archived-NYT-Crosswords/?success=true",
            cancel_url: "https://ragz-da-rascal.github.io/Archived-NYT-Crosswords/?canceled=true",
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error("Stripe error:", err);
        res.status(500).json({ error: "Failed to create donation session" });
    }
});

/* ------------------------------
   Start Server
-------------------------------- */
app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`);
});
