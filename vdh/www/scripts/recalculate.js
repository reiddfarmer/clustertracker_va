/*This script is responsible for reloading the map and introductions at county-level resolution.
The following are necessary for the process to run properly:
    1) A two-column surveillance TSV file with usherIDs and the corresponding county FIPS code
    2) cluster_data_us.json.gz
    3) sample_data_us.json.gz
    4) county_lexicon.{state_of_interest_abbreviation}.txt
    5) State of Interest
    6) regions.js (with counties already included in GeoJSON structure)
    7) regions_us.js
*/

var globalSamples;
var globalClusters;
var globalSamples_county = [];
var globalClusters_county = [];
var alldata =[introData, introData_us, introData_inter];
var max_basecount = [0,0,0];
var geojson = [];
var legend_default;
var stateOfInterest = introData.features.slice(-1)[0].properties["ste_name"][0];
var clusterJSON, sampleJSON, lexicon, surveillance_table;
var loadCounties;

//State Name to Abbreviation for finding lexicon file
const stateAbbreviations = {
    "Alabama": "al",
    "Alaska": "ak",
    "Arizona": "az",
    "Arkansas": "ar",
    "California": "ca",
    "Colorado": "co",
    "Connecticut": "ct",
    "Delaware": "de",
    "Florida": "fl",
    "Georgia": "ga",
    "Hawaii": "hi",
    "Idaho": "id",
    "Illinois": "il",
    "Indiana": "in",
    "Iowa": "ia",
    "Kansas": "ks",
    "Kentucky": "ky",
    "Louisiana": "la",
    "Maine": "me",
    "Maryland": "md",
    "Massachusetts": "ma",
    "Michigan": "mi",
    "Minnesota": "mn",
    "Mississippi": "ms",
    "Missouri": "mo",
    "Montana": "mt",
    "Nebraska": "ne",
    "Nevada": "nv",
    "New Hampshire": "nh",
    "New Jersey": "nj",
    "New Mexico": "nm",
    "New York": "ny",
    "North Carolina": "nc",
    "North Dakota": "nd",
    "Ohio": "oh",
    "Oklahoma": "ok",
    "Oregon": "or",
    "Pennsylvania": "pa",
    "Rhode Island": "ri",
    "South Carolina": "sc",
    "South Dakota": "sd",
    "Tennessee": "tn",
    "Texas": "tx",
    "Utah": "ut",
    "Vermont": "vt",
    "Virginia": "va",
    "Washington": "wa",
    "West Virginia": "wv",
    "Wisconsin": "wi",
    "Wyoming": "wy",
    "District of Columbia": "dc"
  };

//work script and url to properly load .gz files
const workScript = `  
  importScripts("https://cdnjs.cloudflare.com/ajax/libs/pako/2.0.4/pako_inflate.min.js");
    self.onmessage = async (evt) => {
      const file = evt.data;
      const buf = await file.arrayBuffer();
      const decompressed = pako.inflate(buf);
      self.postMessage(decompressed, [decompressed.buffer]);
    };
  `;


//Functon that unzips and loads the 2 .json.gz files
async function loadJSON(dataHost, file) {
    const workerBlob = new Blob([workScript], {type: 'application/javascript'});
    const workerUrl = URL.createObjectURL(workerBlob);
  
    const worker = new Worker(workerUrl);
  
    const compressedBlob1 = await fetch(dataHost + file + '?v=' + new Date().getTime())
        .then((r) => r.blob());
  
    return new Promise((resolve, reject) => {
        worker.onmessage = ({data}) => {
            const outputFile = JSON.parse(new TextDecoder().decode(data));
            resolve(outputFile);
        };
        worker.onerror = (error) => {
            reject(error);
        };
        worker.postMessage(compressedBlob1);
    });
}



//Helper function that parses surveillance .tsv file from fetchTsvFile()
function parseTSV(file) {
    const lines = file.trim().split('\n');
    const dataMap = new Map();

    lines.forEach(line => {
        const parts = line.split('\t');
        if (parts.length !== 2) {
            return;
        }
        const key = parts[0].trim();
        const value = parts[1].trim();

        const isKeyValid = key.startsWith("USA/");
        const isValueValid = /^\d+$/.test(value);
        if (!isKeyValid || !isValueValid) {
            return;
        }
        dataMap.set(key, Number(value));
    });

    return dataMap;
}

//Function that fetches and parses surveillance .tsv file
async function fetchTsvFile() {
    try {
        const response = await fetch('recalculateData/sample_fips.tsv');
        if (!response.ok) { // Check if response status is not in the range 200-299
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.text();
        return parseTSV(data);
    } catch (error) {
        throw error;
    }
}

//Helper function that parses lexicon.txt file
function parseLexicon(file)  { //FIX, see below TO-DO
    const lines = file.trim().split('\n');
    const dataMap = new Map();

    lines.forEach(line => {
        const fields= line.split(",");
        dataMap.set(Number(fields[1]), String(fields[0]));
    });

    return dataMap;
}

//Function that fetches and parses lexicon.txt file
async function fetchTextFile() { //hardcoded for now, TO-DO: refactor fetch files
    const abbr = stateAbbreviations[stateOfInterest];
    try {
        const response = await fetch('recalculateData/county_lexicon.' + abbr + '.txt');
        const data = await response.text();
        return parseLexicon(data);
    } catch (error) {
        console.error('Error fetching the TSV file:', error);
    }
}

//Function that maps region name to ID within regions.js for fast lookup
function createLookupMap(data) {
    var lookupMap = new Map();
    
    data.features.forEach(function(feature) {
        if (feature.properties && feature.properties.coty_name_long && feature.id) {
            lookupMap.set(feature.properties.coty_name_long, feature.id);
        }
        else if (feature.properties && feature.properties.name && feature.id) {
            lookupMap.set(feature.properties.name, feature.id);
        }
    });
    
    return lookupMap;
}

//Helper function for calculating Ixx (Introductions from any region to any region) within LFE
function sumCounts(data, date) {
    let sum = 0;
    let length = data.features.length;
    for (let i=0; i<length; i++) {
        sum += data.features[i].properties.intros[date+"basecount"];
    }
    return sum;
}

//Helper function for calculating Iax (Introductions from origin to any region) within LFE
function sumOrigin(data, index, date) {
    let sum = 0;
    let prefix = date+"raw";
    for (const [key, value] of Object.entries(data.features[index].properties.intros)) {
        if (key.substring(0, prefix.length) === prefix) {
            sum += value;
        }
      }
    return sum;
}

//Calculates and returns LFE, details documented in https://academic.oup.com/ve/article/8/1/veac048/6609172
function logFoldEnrichment(data, index, date, aCount, bCount) {
    if (aCount <= 5) { return -0.5; }
    let iab = aCount;
    let ixx = sumCounts(data, date);
    let iax = sumOrigin(data, index, date);
    let ixb = bCount;
    return Math.log10((iab*ixx)/(iax*ixb));
}

function loadMap() {
    for (j = 0; j < alldata.length; j++) {
        for (i = 0; i < alldata[j].features.length; i++) {
            let bc = alldata[j].features[i]['properties']['intros']['basecount'];
            if (bc > max_basecount[j]) {
                max_basecount[j] = bc;
            }
        }   
        }
    geojson[0] = L.geoJson(alldata[0], {
        style: style,
        onEachFeature: onEachFeature
    });
    map.addLayer(geojson[0]);
    geojson[1] = L.geoJson(alldata[1], {
        style: style,
        onEachFeature: onEachFeature
    });
    geojson[2] = L.geoJson(alldata[2], {
        style: style,
        onEachFeature: onEachFeature
    });

    info.addTo(map);
    legend.addTo(map);
    legend_default = '<strong>Number of Clusters</strong><br>' + getLegendBins(max_basecount[0]);
    legend.update('default');
    initCTGrid(dataHost, taxoniumHost, cDataFile, cSampleFile);
}

function createModeVariables() {
    for (let node of introData.features) {
        if (node['properties']['ste_name'])
            introData_inter['features'].push(node)
    }
}

//Main function responsible for recalculation
function run() {
    iterator = -1;
    // Loop through cluster file and ignore clusters in which region is not state of interest
    for (let cluster of clusterJSON) {
        iterator++;
        if (cluster[1] !== stateOfInterest) {
            continue;
        }

        // Find introduction sample within cluster
        const currentCluster = sampleJSON[iterator][0];
        const introSample = currentCluster.substring(0, currentCluster.indexOf(',')).toString();

        // Search for introduction sample within surveillance file
        const fips = surveillance_table.get(introSample);

        // Ignore and continue if introduction sample is NOT found
        if (fips === undefined || introSample === '') {
            continue;
        }

        // Find difference between today's date and sample date
        const sampleDateArray = cluster[3].split("-");
        let today = new Date();
        today = today.getFullYear() * 12 + today.getMonth() + 1;
        const sampleDate = sampleDateArray[0] * 12 + parseInt(sampleDateArray[1]);
        const monthDiff = today - sampleDate;

        // Extract relevant information from cluster file: region, origin, date (above), number of samples in this cluster
        const region = lexicon.get(fips);
        cluster_copy = JSON.parse(JSON.stringify(cluster));
        cluster_copy[1] = region;
        globalClusters_county.push(cluster_copy);
        globalSamples_county.push(sampleJSON[iterator]);
        const origin = cluster[7];

        // Assign variables to properly interact with GeoJSON structure within regions.js
        var regionToIDMap = createLookupMap(introData);
        let regionID = regionToIDMap.get(region).toString();
        let regionIndex = parseInt(regionID) - 1;
        let currentRegion = introData.features[regionIndex].properties.intros;

        if (origin === "indeterminate") {
            currentRegion["basecount"] ? currentRegion["basecount"] += 1 : currentRegion["basecount"] = 1;
            currentRegion[regionID] = -0.5;
            if (monthDiff <= 12) {
                currentRegion["12_basecount"] ? currentRegion["12_basecount"] += 1 : currentRegion["12_basecount"] = 1;
                currentRegion["12_" + regionID] = -0.5;
            }
            if (monthDiff <= 6) {
                currentRegion["6_basecount"] ? currentRegion["6_basecount"] += 1 : currentRegion["6_basecount"] = 1;
                currentRegion["6_" + regionID] = -0.5;
            }
            if (monthDiff <= 3) {
                currentRegion["3_basecount"] ? currentRegion["3_basecount"] += 1 : currentRegion["3_basecount"] = 1;
                currentRegion["3_" + regionID] = -0.5;
            }
            continue;
        }

        let originID = regionToIDMap.get(origin).toString();
        let originIndex = parseInt(originID) - 1;
        let currentOrigin = introData.features[originIndex].properties.intros;

        // Assign or increment raw counts from origin to region
        currentOrigin["raw" + regionID] ? currentOrigin["raw" + regionID] += 1 : currentOrigin["raw" + regionID] = 1;
        // Assign sample basecounts to region
        currentRegion["basecount"] ? currentRegion["basecount"] += 1 : currentRegion["basecount"] = 1;
        // Assign LFE from origin to region
        let base = currentRegion["basecount"];
        let rawcounts = currentOrigin["raw" + regionID];
        currentOrigin[regionID] = logFoldEnrichment(introData, originIndex, "", rawcounts, base);
        currentRegion[regionID] = -0.5; // Assign default LFE from region to region

        // Perform the above assignments for samples within 12 months
        if (monthDiff <= 12) {
            currentOrigin["12_raw" + regionID] ? currentOrigin["12_raw" + regionID] += 1 : currentOrigin["12_raw" + regionID] = 1;
            currentRegion["12_basecount"] ? currentRegion["12_basecount"] += 1 : currentRegion["12_basecount"] = 1;
            base = currentRegion["12_basecount"];
            rawcounts = currentOrigin["12_raw" + regionID];
            currentOrigin["12_" + regionID] = logFoldEnrichment(introData, originIndex, "12_", rawcounts, base);
            currentRegion["12_" + regionID] = -0.5; // Assign default LFE from region to region
        }
        // Perform the above assignments for samples within 6 months
        if (monthDiff <= 6) {
            currentOrigin["6_raw" + regionID] ? currentOrigin["6_raw" + regionID] += 1 : currentOrigin["6_raw" + regionID] = 1;
            currentRegion["6_basecount"] ? currentRegion["6_basecount"] += 1 : currentRegion["6_basecount"] = 1;
            base = currentRegion["6_basecount"];
            rawcounts = currentOrigin["6_raw" + regionID];
            currentOrigin["6_" + regionID] = logFoldEnrichment(introData, originIndex, "6_", rawcounts, base);
            currentRegion["6_" + regionID] = -0.5; // Assign default LFE from region to region
        }
        // Perform the above assignments for samples within 3 months
        if (monthDiff <= 3) {
            currentOrigin["3_raw" + regionID] ? currentOrigin["3_raw" + regionID] += 1 : currentOrigin["3_raw" + regionID] = 1;
            currentRegion["3_basecount"] ? currentRegion["3_basecount"] += 1 : currentRegion["3_basecount"] = 1;
            base = currentRegion["3_basecount"];
            rawcounts = currentOrigin["3_raw" + regionID];
            currentOrigin["3_" + regionID] = logFoldEnrichment(introData, originIndex, "3_", rawcounts, base);
            currentRegion["3_" + regionID] = -0.5; // Assign default LFE from region to region
        }
    }
    createModeVariables();
    document.getElementById('btn_intra').style.display = 'initial';
    //loadMap() consists of code taken from main.js for initial map and legend load
    loadMap();
    window.map.flyTo(stateGeographicalCenters[stateOfInterest], 6);
    const button = document.getElementById('btn_SC');
    if (button) {
        button.style.display = 'initial';
    }
}

async function loadFiles() {
    try {
        // Load the 4 relevant files (regions.js does not require loading)
        clusterJSON = await loadJSON('recalculateData/', 'cluster_data_us.json.gz');
        sampleJSON = await loadJSON('recalculateData/', 'sample_data_us.json.gz');
        globalClusters = clusterJSON;
        globalSamples = sampleJSON;
        lexicon = await fetchTextFile();
    } catch (error) { // Catch if files do not load properly
        console.error("Error loading or processing data:", error);
        return;
    }

    // Create a promise for fetchTsvFile
    const fetchTsvPromise = fetchTsvFile();

    fetchTsvPromise
        .then(result => {
            surveillance_table = result;
            run();
        })
        .catch(error => {
            console.error('Surveillance File not found. Loading normally.', error);
            alldata = [introData_us];
            loadMap();
            window.map.setZoom(3.5);
        });
}

// Start the process
loadFiles();
