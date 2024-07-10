/*This script is responsible for reloading the map and introductions at county-level resolution.
The following are necessary for the process to run properly:
    1) A two-column surveillance TSV file with usherIDs and the corresponding county FIPS code
    2) cluster_data.json.gz
    3) sample_data.json.gz
    4) county_lexicon.{state_of_interest_abbreviation}.txt
    5) State of Interest
    6) regions.js (with counties already included in GeoJSON structure)
    

Possible/likely issues:
    1) The code accesses the necessary files from /tempData instead of /data with soft link
    2) State of Interest is hardcoded
    3) parseTSV uses RegEx spacing to parse instead of tab character
    4) Map requires interaction before coloring properly
    5) State of Interest is still interactive, despite removal at end of run()
*/


tsvFile = ""
//tsvFile in function hardcoded for MVP


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
const url = 'https%3A%2F%2Ftaxonium.big-tree.ucsc.edu';

let stateOfInterest = introData.features.splice(-1)[0].properties["ste_name"][0];

//Functon that unzips and loads the 2 .json.gz files
async function loadJSON(dataHost, taxoniumURL, file) {
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

//Function to reassign region IDs to account for the removal of state of interest within introData within regions.js
function reassignIDs(data) {
    arr = data.features;
    let skippedID = -1;
    for (let i = 0; i < arr.length; i++) {
        if (parseInt(arr[i].id) !== i + 1) {
            skippedID = i + 1;
            break;
        }
    }
    if (skippedID === -1) {
        return;
    }
    for (let i = skippedID - 1; i < arr.length; i++) {
        arr[i].id = (arr[i].id - 1).toString();
    }
}


//Helper function that parses surveillance .tsv file from fetchTsvFile()
function parseTSV(file)  { //FIX: edit later on to deal with surveillance file properly
    const lines = file.trim().split('\n');
    const dataMap = new Map();

    lines.forEach(line => {
        if (line.substring(1) === " ") { return; }
        const [key, value] = line.split(/\s+/);
        dataMap.set(String(key), Number(value));
    });

    return dataMap;
}
//Function that fetches and parses surveillance .tsv file
async function fetchTsvFile() {
    try {
        const response = await fetch('tempData/test_surveillance.tsv');
        const data = await response.text();
        return parseTSV(data);
    } catch (error) {
        console.error('Error fetching the TSV file:', error);
    }
}

//Helper function that parses lexicon.txt file
function parseLexicon(file)  { //FIX, see below TO-DO
    const lines = file.trim().split('\n');
    const dataMap = new Map();

    lines.forEach(line => {
        const fields= line.split(",");
        dataMap.set(Number(fields[1]), String(fields[2]));
    });

    return dataMap;
}

//Function that fetches and parses lexicon.txt file
async function fetchTextFile() { //hardcoded for now, TO-DO: refactor fetch files
    try {
        const response = await fetch('tempData/county_lexicon.va.txt');
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
        if (feature.properties && feature.properties.name && feature.id) {
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

//Main function responsible for recalculation
async function run() {
    try {
        //Load the 4 revelant files (regions.js does not require loading)
        const clusterJSON = await loadJSON('tempData/', url, 'cluster_data.json.gz');
        const sampleJSON = await loadJSON('tempData/', url, 'sample_data.json.gz');
        const surveillance_table = await fetchTsvFile();
        const lexicon = await fetchTextFile();
        //Reassign IDs to account for the removal of state of interest within introData within regions.js
        reassignIDs(introData);
        iterator = -1;
        //Loop through cluster file and ignore clusters in which region is not state of interest
        for (let cluster of clusterJSON) {
            iterator++;
            if (cluster[1] !== stateOfInterest) {
                continue;
            }
            //Find intoduction sample within cluster
            const currentCluster = sampleJSON[iterator][0];
            const introSample = currentCluster.substring(0, currentCluster.indexOf(',')).toString();
            //Search for introduction sample within surveillance file
            const fips = surveillance_table.get(introSample);
            //Ignore and continue if introduction sample is NOT found
            if (fips === undefined || introSample === '') {
                continue;
            }
            //Find difference between today's date and sample date
            const sampleDateArray = cluster[3].split("-");
            let today = new Date();
            today = today.getFullYear()*12 + today.getMonth()+1;
            const sampleDate = sampleDateArray[0]*12 + parseInt(sampleDateArray[1]);
            const monthDiff = today - sampleDate;

            //Extract relevant information from cluster file: region, origin, date (above), number of samples in this cluster
            const region = lexicon.get(fips);
            const origin = cluster[7];

            //Assign variables to properly interact with GeoJSON structure within regions.js
            var regionToIDMap = createLookupMap(introData);
            let regionID = regionToIDMap.get(region).toString();
            let regionIndex = parseInt(regionID)-1;
            let currentRegion = introData.features[regionIndex].properties.intros;

            if (origin === "indeterminate") {
                currentRegion["basecount"] ? currentRegion["basecount"] += 1 : currentRegion["basecount"] = 1;
                currentRegion[regionID] = -0.5;
                if (monthDiff <= 12) {
                    currentRegion["12_basecount"] ? currentRegion["12_basecount"] += 1 : currentRegion["12_basecount"] = 1;
                    currentRegion["12_"+regionID] = -0.5;
                }
                if (monthDiff <= 6) {
                    currentRegion["6_basecount"] ? currentRegion["6_basecount"] += 1 : currentRegion["6_basecount"] = 1;
                    currentRegion["6_"+regionID] = -0.5;
                }
                if (monthDiff <= 3) {
                    currentRegion["3_basecount"] ? currentRegion["3_basecount"] += 1 : currentRegion["3_basecount"] = 1;
                    currentRegion["3_"+regionID] = -0.5;
                }
                continue;
            }

            let originID = regionToIDMap.get(origin).toString();
            let originIndex = parseInt(originID)-1;
            let currentOrigin = introData.features[originIndex].properties.intros;

            //Assign or increment raw counts from origin to region
            currentOrigin["raw"+regionID] ? currentOrigin["raw"+regionID] += 1 : currentOrigin["raw"+regionID] = 1;
            //Assign sample basecounts to region
            currentRegion["basecount"] ? currentRegion["basecount"] += 1 : currentRegion["basecount"] = 1;
            //Assign LFE from origin to region
            let base = currentRegion["basecount"];
            let rawcounts = currentOrigin["raw"+regionID];
            currentOrigin[regionID] = logFoldEnrichment(introData, originIndex, "", rawcounts, base);
            currentRegion[regionID] = -0.5; //Assign default LFE from region to region

            //Perform the above assignments for samples within 12 months
            if (monthDiff <= 12) {
                currentOrigin["12_raw"+regionID] ? currentOrigin["12_raw"+regionID] += 1 : currentOrigin["12_raw"+regionID] = 1;
                currentRegion["12_basecount"] ? currentRegion["12_basecount"] += 1 : currentRegion["12_basecount"] = 1;
                base = currentRegion["12_basecount"];
                rawcounts = currentOrigin["12_raw"+regionID];
                currentOrigin["12_"+regionID] = logFoldEnrichment(introData, originIndex, "12_", rawcounts, base);
                currentRegion["12_"+regionID] = -0.5; //Assign default LFE from region to region
            }
            //Perform the above assignments for samples within 6 months
            if (monthDiff <= 6) {
                currentOrigin["6_raw"+regionID] ? currentOrigin["6_raw"+regionID] += 1 : currentOrigin["6_raw"+regionID] = 1;
                currentRegion["6_basecount"] ? currentRegion["6_basecount"] += 1 : currentRegion["6_basecount"] = 1;
                base = currentRegion["6_basecount"];
                rawcounts = currentOrigin["6_raw"+regionID];
                currentOrigin["6_"+regionID] = logFoldEnrichment(introData, originIndex, "6_", rawcounts, base);
                currentRegion["6_"+regionID] = -0.5; //Assign default LFE from region to region
            }
            //Perform the above assignments for samples within 3 months
            if (monthDiff <= 3) {
                currentOrigin["3_raw"+regionID] ? currentOrigin["3_raw"+regionID] += 1 : currentOrigin["3_raw"+regionID] = 1;
                currentRegion["3_basecount"] ? currentRegion["3_basecount"] += 1 : currentRegion["3_basecount"] = 1;
                base = currentRegion["3_basecount"];
                rawcounts = currentOrigin["3_raw"+regionID];
                currentOrigin["3_"+regionID] = logFoldEnrichment(introData, originIndex, "3_", rawcounts, base);
                currentRegion["3_"+regionID] = -0.5; //Assign default LFE from region to region
            }
        }
    } catch (error) { //Catch if files do not load properly
        console.error("Error loading or processing data:", error);
    }
    alert("Recalculated!")
}
// Start the process
run();
