import { Console } from "console";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const fetch = require('node-fetch')
const cheerio = require('cheerio')
const iconvlite = require('iconv-lite');
const path = require('node:path');
const url = require('node:url');
const fs = require('fs');

import pLimit from 'p-limit';
import { exit } from "process";

const baseURL = 'http://cafma.free.fr';
const limit = pLimit(5);

function simplifyString(input) {
    return input.trim().replace(/\s\s+/g, ' ');
}

let downloadImages = false;
if (process.argv.find(arg => arg == "--download-images")) {
    downloadImages = true;
}

async function fetchZoneDetails(uri, details) {
    return fetch(uri).then((response) => response.textConverted().then((html) => {
        let result = 1;

        const $ = cheerio.load(iconvlite.decode(html, "windows-1252").toString())

        const image = $('img[src$=.jpg]');
        const routesTable = $('table > tbody > tr > td[bgcolor=#000000]');

        if (image.length == 1) {
            const imageName = image.attr("src");

            // get the pathname
            const navigationPath = path.parse(url.parse(uri).pathname);
            // join the pathname to the dir name
            const imagePathName = path.join(navigationPath.dir, imageName);
            // make a URL with this path
            const imageUri = new url.URL(imagePathName, baseURL);

            if (downloadImages) {
                result = fetch(imageUri).then((res) => {
                    const outputImagePath = path.join("images", navigationPath.dir.substring(1)); // remove first char (which is a slash)

                    console.log(`downloading ${imageUri} to ${outputImagePath}/${imageName}`)

                    if (!fs.existsSync(outputImagePath)) {
                        fs.mkdirSync(outputImagePath, { recursive: true });
                    }

                    const fileStream = fs.createWriteStream(path.join("images", imagePathName.substring(1)));
                    return res.body.pipe(fileStream);
                }
                );
            }
            details.imageURI = imagePathName;

        }

        if (routesTable.length > 1) {
            $('table').each(function (i, element) {
                if ($('tr', element).length == routesTable.length) {
                    let routes = [];
                    $('tr', element).each(function (i, tableRow) {

                        let route = {};

                        // TODO liste des cas particulier qui mettent tout en vrille
                        // * roche/beleperon
                        // * Enbeys/Enbeys/Aiguille_En_Beys
                        // * Enbeys/Couillade
                        // * madelon/contrefort
                        // * madelon/madelon
                        const data = $('td', tableRow)
                        if (data.length == 5) {
                            route.number = simplifyString($(data[0]).text())
                            route.name = simplifyString($(data[1]).text())
                            route.pitch = simplifyString($(data[2]).text())
                            route.grade = simplifyString($(data[3]).text())
                            route.length = simplifyString($(data[4]).text())
                        } else if (data.length == 4) {
                            route.number = simplifyString($(data[0]).text())
                            route.name = simplifyString($(data[1]).text())
                            route.grade = simplifyString($(data[2]).text())
                            route.length = simplifyString($(data[3]).text())
                        }

                        if (Object.keys(route).length > 0) {
                            routes.push(route)
                        } else {
                            console.error(`failed to parse route in '${details.name}'`)
                        }
                    });

                    if(routes.length > 0 ) {
                        details.routes = routes;
                    } else {
                        console.error(`failed to parse any route for '${details.name}'`)
                    }
                }
            })
        }

        if (!details.routes || details.routes.length === 0) {
            console.error(`could not find routes for: ${details.name}`)
        }

        return result;

    }));
}

async function parseAccess(uri, site) {
    return fetch(uri).then((response) => response.textConverted().then((html) => {
        const $ = cheerio.load(iconvlite.decode(html, "windows-1252").toString());
        $('table > tbody > tr')
    }));
}

async function parseSite(uri, site) {
    const siteUri = new url.URL(uri, baseURL);
    const response = await fetch(siteUri);
    const html = await response.textConverted();

    let $ = cheerio.load(iconvlite.decode(html, "windows-1252").toString())
    // find the source of the frame
    const navigationSrc = $('html > frameset > frame[target=haut]').attr("src");
    // get the pathname
    const navigationPath = path.parse(url.parse(uri).pathname);
    // join the pathname to the dir name
    const navigationPathName = path.join(navigationPath.dir, navigationSrc);
    // make a URL with this path
    const navigationUri = new url.URL(navigationPathName, baseURL);

    const navigationResponse = await fetch(navigationUri);
    const navigationHtml = await navigationResponse.textConverted();

    // now fetch the navigation frame
    $ = cheerio.load(navigationHtml)

    let zones = [];

    const tableData = $('div > table > tbody > tr > td');
    tableData.each(function (i, element) {

        let zone = null;
        if ($('a > b', element).html()) {
            zone = $('a > b', element).text();
        }
        else {
            zone = $('a', element).text();
        }

        const location = $("a", element).attr('href');

        zone = simplifyString(zone);

        if (zone == "Accès") {
            zones.push(parseAccess(new url.URL(path.join(navigationPath.dir, location), baseURL).toString(), site))
        } else if (zone != '' && zone != "Accueil" && zone != "Photos") {
            let zoneObject = { name: zone };
            site.zones.push(zoneObject);
            zones.push(fetchZoneDetails(new url.URL(path.join(navigationPath.dir, location), baseURL).toString(), zoneObject));
        }


    });

    return Promise.all(zones);
}

async function parseRoot(uri) {
    const response = await fetch(uri);
    const html = await response.textConverted();

    const $ = cheerio.load(iconvlite.decode(html, "windows-1252").toString())

    let sites = [];

    let sitePromises = [];

    const rows = $('html > body > div > center > table > tbody > tr');
    rows.each(function (i, element) {
        let name = undefined;
        if ($("a > font > span", element).html()) { name = $("a > font > span", element).text(); }
        else if ($("a > span > strong", element).html()) { name = $("a > span > strong", element).text(); }
        else { name = $("a > font", element).text(); }

        if (name == '') {
            throw `failed to parse element: ${$(element).html()}`
        }

        const tds = $("td", element);
        const description = simplifyString($(tds[1]).text());

        const location = $("a", element).attr('href');

        let site = {
            name: simplifyString(name),
            description: description,
            zones: []
        };

        const siteDetails = parseSite(location, site)
        sitePromises.push(siteDetails);
        sites.push(site);
    });

    Promise.all(sitePromises).then(() => {
        fs.writeFileSync("sites.json", JSON.stringify(sites, null, 2))
    });
}

let index = -1;
if (index = process.argv.findIndex(arg => arg == "--fetch-zone") && index >= 0) {
    if (process.argv.length < index + 1) {
        console.error(`pass a URI to fetch the zone, e.g. 'http://cafma.free.fr/alliat/Loubetiere/loubetiere1.htm'`)
        exit(0);
    }
    const zoneURI = process.argv[index + 1]
    fetchZoneDetails(zoneURI, {});
} else {
    parseRoot(`${baseURL}/secteurs.htm`);
}