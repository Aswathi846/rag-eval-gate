import { pipeline } from '@xenova/transformers';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly point to .env.local in project root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("ERROR: DATABASE_URL is missing from .env.local!");
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

const HANDBOOK_DATA = [
    {
        section: "Lost or Stolen Cards",
        content: "If you have lost your debit card or suspect it was stolen, call us immediately at 0800 555 0199 to block the card."
    },
    {
        section: "Daily Transfer Limits",
        content: "The maximum amount you can transfer in a single day via online or mobile banking is £25,000."
    },
    {
        section: "Opening Hours",
        content: "Branches are open Monday to Friday from 9:00 AM to 5:00 PM, Saturday from 9:00 AM to 1:00 PM, and closed on Sundays."
    },
    {
        section: "App Credentials & Password Reset",
        content: "If you forget your mobile app password, select 'Forgotten password' on the login screen to receive a secure reset link."
    },
    {
        section: "Overdraft Fees",
        content: "Standard unarranged overdrafts incur a fee of 6 pounds per day up to a maximum of £60 per month."
    },
    {
        section: "Fraud & Security Inquiries",
        content: "Meridian Bank will never ask for your PIN or full password. If someone calls claiming to be from Meridian and asks for your PIN, report it immediately to 0800 555 0177."
    }
];

async function ingest() {
    console.log("Loading embedding model...");
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    for (const item of HANDBOOK_DATA) {
        console.log(`Embedding section: ${item.section}`);
        const output = await extractor(item.content, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data);

        await pool.query(
            `INSERT INTO meridian_documents (section_title, content, embedding)
       VALUES ($1, $2, $3::vector)`,
            [item.section, item.content, JSON.stringify(embedding)]
        );
    }

    console.log("Ingestion completed successfully!");
    await pool.end();
}

ingest().catch(console.error);