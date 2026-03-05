// This fix is for the weird Node 18 error we were getting this was the only way to get it to work
if (typeof global.File === 'undefined') {
    global.File = class File {};
}

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

// --- TASK 1: CS Courses ---
async function scrapeBulletin() {
    try {
        console.log('Starting Task 1...');
        // URL for the CS courses
        const url = 'https://bulletin.du.edu/undergraduate/coursedescriptions/comp/';
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const courses = [];

        $('.courseblock').each((i, el) => {
            const titleText = $(el).find('.courseblocktitle').text().trim();
            const desc = $(el).find('.courseblockdesc').text().trim();
            
            // Regex to get the course code and name
            const match = titleText.match(/(COMP\s(\d{4}))\s+(.*?)\s*(?:\(|$)/);

            if (match) {
                const code = match[1].replace(' ', '-');
                const num = parseInt(match[2]);
                const title = match[3].trim();

                // Only keep 3000+ level with no prerequisites
                if (num >= 3000 && desc.toLowerCase().indexOf('prerequisite') === -1) {
                    courses.push({
                        course: code,
                        title: title
                    });
                }
            }
        });

        await fs.outputJson('results/bulletin.json', { courses: courses }, { spaces: 2 });
        console.log('Task 1 done, check bulletin.json');
    } catch (err) {
        console.log('Error in Task 1: ' + err.message);
    }
}

// --- TASK 2: Sports Events ---
async function scrapeAthletics() {
    try {
        console.log('Starting Task 2...');
        const url = 'https://denverpioneers.com/index.aspx';
        // Added a user-agent just in case they block me
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        const events = [];

        // Finding the sports cards in the carousel
        $('.sidearm-common-carousel-item, .sidearm-event-card').each((i, el) => {
            const opponent = $(el).find('.sidearm-common-carousel-item-opponent-name, .sidearm-event-card-opponent-name').text().trim();
            const date = $(el).find('.sidearm-common-carousel-item-date, .sidearm-event-card-date').text().trim();
            let duTeam = $(el).find('.sidearm-common-carousel-item-team-name, .sidearm-event-card-team-name').text().trim();
            
            // If team name is blank, just use Pioneers
            if (!duTeam) {
                duTeam = "Denver Pioneers";
            }

            if (opponent && date) {
                events.push({
                    duTeam: duTeam,
                    opponent: opponent,
                    date: date
                });
            }
        });

        await fs.outputJson('results/athletic_events.json', { events: events }, { spaces: 2 });
        console.log('Task 2 done, check athletic_events.json');
    } catch (err) {
        console.log('Error in Task 2: ' + err.message);
    }
}

// --- TASK 3: 2025 Calendar ---
async function scrapeCalendar() {
    try {
        console.log('Starting Task 3 (Deep Scraping)...');
        const url = 'https://www.du.edu/calendar?search=&start_date=2025-01-01&end_date=2025-12-31';
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const events = [];
        const links = [];

        // Getting all the links first
        $('a.event-card, .listing-event a').each((i, el) => {
            let path = $(el).attr('href');
            if (path) {
                if (path.indexOf('http') === -1) {
                    path = 'https://www.du.edu' + path;
                }
                links.push(path);
            }
        });

        // Going into each link to get the description
        // only doing 10 so it doesn't take forever
        for (let i = 0; i < 10; i++) {
            if (links[i]) {
                try {
                    const detailPage = await axios.get(links[i]);
                    const $detail = cheerio.load(detailPage.data);
                    
                    const item = {
                        title: $detail('h1').first().text().trim(),
                        date: $detail('.event-details__date').text().trim()
                    };

                    const time = $detail('.event-details__time').text().trim();
                    if (time) {
                        item.time = time;
                    }

                    const desc = $detail('.event-description').text().trim();
                    if (desc) {
                        item.description = desc;
                    }

                    events.push(item);
                } catch (e) {
                    // skip if a link breaks
                }
            }
        }

        await fs.outputJson('results/calendar_events.json', { events: events }, { spaces: 2 });
        console.log('Task 3 done, check calendar_events.json');
    } catch (err) {
        console.log('Error in Task 3: ' + err.message);
    }
}

// Running everything
async function main() {
    await fs.ensureDir('results');
    await scrapeBulletin();
    await scrapeAthletics();
    await scrapeCalendar();
    console.log('All assignments finished!');
}

main();