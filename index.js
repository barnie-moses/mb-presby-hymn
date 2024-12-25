const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const PORT = process.env.PORT || 8000;

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
    {
        name: "hymnal 201-300",
        address: "https://hymnary.org/hymnal/PH1990?page=2",
        base: "https://hymnary.org",
        postUrl: "#text"
    },
    {
        name: "hymnal 301-400",
        address: "https://hymnary.org/hymnal/PH1990?page=3",
        base: "https://hymnary.org",
        postUrl: "#text"
    },
    {
        name: "hymnal 401-500",
        address: "https://hymnary.org/hymnal/PH1990?page=4",
        base: "https://hymnary.org",
        postUrl: "#text"
    },
    {
        name: "hymnal 501-600",
        address: "https://hymnary.org/hymnal/PH1990?page=5",
        base: "https://hymnary.org",
        postUrl: "#text"
    },
    {
        name: "hymnal 601-605",
        address: "https://hymnary.org/hymnal/PH1990?page=6",
        base: "https://hymnary.org",
        postUrl: "#text"
    }
];

app.get('/', (req, res) => {
    res.json('Welcome to my Presbyterian Hymn API');
});



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


const filterHymns = () => {
    return hymns.filter(
        hymn => hymn.title && !/^\d+$/.test(hymn.title) && !/^_+$/.test(hymn.title)
    );
};


const scrapeHymnDetails = async (filteredHymns) => {
    const details = [];

    const scrapePromises = filteredHymns.map(async hymn => {
        try {
            const response = await axios.get(hymn.url);

            if (response.status === 200) {
                const html = response.data;
                const $ = cheerio.load(html);

                const textContent = [];
                $('#text p').each(function () {
                    textContent.push($(this).text().trim());
                });

                details.push({
                    title: hymn.title,
                    url: hymn.url,
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


const normalizeString = (str) => {
    return str
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

app.get('/hymns/:hymnId', async (req, res) => {
    const hymnId = normalizeString(decodeURIComponent(req.params.hymnId));

    const matchingHymns = hymns.filter(hymn => normalizeString(hymn.title).includes(hymnId));

    if (matchingHymns.length === 0) {
        return res.status(404).json({ error: 'Hymn not found' });
    }

    // If there are multiple matches, return all matching hymns
    if (matchingHymns.length > 1) {
        return res.json({ matches: matchingHymns });
    }

    const hymn = matchingHymns[0];

    try {
        const response = await axios.get(hymn.url);

        if (response.status === 200) {
            const html = response.data;
            const $ = cheerio.load(html);

            const textContent = [];
            $('#text p').each(function () {
                textContent.push($(this).text().trim());
            });

            return res.json({
                title: hymn.title,
                text: textContent.join('\n') || 'Text not available',
                source: hymn.source,
                url: hymn.url,
            });
        } else {
            return res.status(500).json({ error: 'Error fetching hymn details' });
        }
    } catch (err) {
        console.error(`Error fetching hymn details for ${hymn.title}:`, err);
        return res.status(500).json({ error: 'Error fetching hymn details' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
