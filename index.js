const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const PORT = 8000;

const app = express();

const links = []; // Initialize links array

app.get('/', (req, res) => {
    res.json('Welcome to my Presbyterian Hymn API');
});

app.get('/hymns', (req, res) => {
    axios.get('https://hymnary.org/hymnal/PH1990')
        .then(response => {
            const html = response.data;
            const $ = cheerio.load(html);

            // Select all <a> tags and filter those containing "hymn/PH1990"
            $('a').each(function () {
                const url = $(this).attr('href'); // Extract href attribute
                const title = $(this).text().trim(); // Extract and trim text

                // Check if href contains "hymn/PH1990"
                if (url && url.includes('hymn/PH1990')) {
                    links.push({
                        title,
                        url
                    });
                }
            });

            res.json(links); // Return the collected links
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'An error occurred while fetching data' });
        });
});

app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
