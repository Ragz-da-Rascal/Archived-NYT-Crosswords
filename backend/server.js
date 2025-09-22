// backend/server.js
const express = require("express");
const fs = require("fs");
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
app.get('/api/crosswords/:year/random', (req, res) => {
    try {
        const year = req.params.year;
        const yearPath = path.join(__dirname, 'nyt_crosswords', year);

        if (!fs.existsSync(yearPath)) {
            return res.status(404).json({ error: 'Year not found' });
        }

        const months = fs.readdirSync(yearPath).filter(f =>
            fs.statSync(path.join(yearPath, f)).isDirectory()
        );

        if (months.length === 0) {
            return res.status(404).json({ error: 'No months found' });
        }

        const month = months[Math.floor(Math.random() * months.length)];
        const monthPath = path.join(yearPath, month);
        const dayFiles = fs.readdirSync(monthPath).filter(f => f.endsWith('.json'));

        if (dayFiles.length === 0) {
            return res.status(404).json({ error: 'No days found' });
        }

        const dayFile = dayFiles[Math.floor(Math.random() * dayFiles.length)];
        const filePath = path.join(monthPath, dayFile);
        const puzzle = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        res.json({
            year,
            month,
            day: dayFile.replace('.json', ''),
            puzzle
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
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
