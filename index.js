const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const PORT = 8000;

const app = express();

const hymns = [];

const hymnals = [
    {
        name: "hymnal 1-100",
        address: "https://hymnary.org/hymnal/PH1990?page=0",
        base: "https://hymnary.org",
        postUrl: "#text"
    },
    {
        name: "hymnal 101-200",
        address: "https://hymnary.org/hymnal/PH1990?page=1",
        base: "https://hymnary.org",
        postUrl: "#text"
    },
    // Add more hymnals as needed
];

app.get('/', (req, res) => {
    res.json('Welcome to my Presbyterian Hymn API');
});

// Helper function to fetch hymn links
const getHymns = async () => {
    for (let hymnal of hymnals) {
        try {
            const response = await axios.get(hymnal.address);
            const html = response.data;
            const $ = cheerio.load(html);

            $('a', html).each(function () {
                const url = $(this).attr('href');
                const title = $(this).text().trim();

                if (url && url.includes('hymn/PH1990')) {
                    hymns.push({
                        title,
                        url: hymnal.base + url + hymnal.postUrl,
                        source: hymnal.name
                    });
                }
            });
        } catch (err) {
            console.error(`Error fetching hymnal ${hymnal.name}:`, err);
        }
    }
};

// Function to filter out invalid hymns
const filterHymns = () => {
    return hymns.filter(
        hymn => hymn.title && !/^\d+$/.test(hymn.title) && !/^_+$/.test(hymn.title)
    );
};

// Function to scrape hymn details from `<div id="text">`
const scrapeHymnDetails = async (filteredHymns) => {
    const details = [];

    const scrapePromises = filteredHymns.map(async hymn => {
        try {
            const response = await axios.get(hymn.url);

            if (response.status === 200) {
                const html = response.data;
                const $ = cheerio.load(html);

                // Extract all `<p>` tags inside `<div id="text">`
                const textContent = [];
                $('#text p').each(function () {
                    textContent.push($(this).text().trim());
                });

                details.push({
                    title: hymn.title,
                    text: textContent.join('\n'),
                    source: hymn.source,
                });
            }
        } catch (err) {
            console.error(`Error scraping hymn ${hymn.title}:`, err);
        }
    });

    await Promise.all(scrapePromises);
    return details;
};

// Endpoint to fetch hymn details
app.get('/hymns', async (req, res) => {
    try {
        await getHymns();
        const filteredHymns = filterHymns();
        const hymnDetails = await scrapeHymnDetails(filteredHymns);
        res.json(hymnDetails);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching hymns' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
