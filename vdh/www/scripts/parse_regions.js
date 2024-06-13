
//Input: regions_us.js (from server), County TSV file (from user)
//Output: regions.js (with added counties and corresponding cluster data)
//Questions:

//TEST FUNCTION
// function updateJS() {
//     // Simulate a delay to mimic processing time
//     setTimeout(() => {
//         alert('success');
//     }, 1000); // 1-second delay for demonstration
// }

function updateJS() {
    // Hardcoded contents of county.geojson
    const geojson = {}

    // Hardcoded contents of cluster.tsv
    const clusterText = ''.trim()

    const updatedGeoJSON = processGeoJSON(geojson, clusterText);
    console.log(updatedGeoJSON);
    alert('success');
}

function processGeoJSON(geojson, clusterText) {
    const monthswap = {
        "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", 
        "Jun": "06", "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", 
        "Nov": "11", "Dec": "12"
    };

    const today = new Date();
    const datepoints = [
        "all", 
        new Date(today.setMonth(today.getMonth() - 12)), 
        new Date(today.setMonth(today.getMonth() - 6)), 
        new Date(today.setMonth(today.getMonth() - 3))
    ];

    let svd = { "type": "FeatureCollection", "features": [] };
    const prefd = {
        [datepoints[0]]: "", 
        [datepoints[1]]: "12_", 
        [datepoints[2]]: "6_", 
        [datepoints[3]]: "3_"
    };
    let dinvc = datepoints.reduce((acc, d) => (acc[d] = {}, acc), {});
    let dsvc = datepoints.reduce((acc, d) => (acc[d] = {}, acc), {});
    let dotvc = datepoints.reduce((acc, d) => (acc[d] = {}, acc), {});
    let dovc = datepoints.reduce((acc, d) => (acc[d] = {}, acc), {});

    // Process the cluster text
    let clusterData = clusterText.split('\n');
    clusterData.forEach(entry => {
        let spent = entry.trim().split("\t");
        if (spent[0] === "cluster_id") return;

        let reg = spent[9].replace("_", " ");
        if (spent[10].includes("indeterminate")) return;

        let dsplt = spent[2].split("-");
        let cdate = dsplt == "no-valid-date".split("-") 
            ? new Date(2019, 10, 1) 
            : new Date(parseInt(dsplt[0]), parseInt(monthswap[dsplt[1]]) - 1, parseInt(dsplt[2]));

        datepoints.forEach(startdate => {
            if (startdate === "all" || cdate > startdate) {
                dsvc[startdate][reg] = (dsvc[startdate][reg] || 0) + spent[spent.length - 1].split(',').length;
                dinvc[startdate][reg] = (dinvc[startdate][reg] || 0) + 1;
                
                let otvc = dotvc[startdate];
                let ovc = dovc[startdate];
                if (!ovc[reg]) ovc[reg] = {};

                spent[10].split(",").forEach(tlo => {
                    let orig = tlo.replace("_", " ");
                    otvc[orig] = (otvc[orig] || 0) + 1;
                    ovc[reg][orig] = (ovc[reg][orig] || 0) + 1;
                });
            }
        });
    });

    let dsumin = Object.fromEntries(Object.entries(dinvc).map(([sd, invc]) => [sd, Object.values(invc).reduce((a, b) => a + b, 0)]));
    let sids = {};
    let id = 0;

    geojson.features.forEach(data => {
        data.properties.intros = {};
        Object.entries(dinvc).forEach(([sd, invc]) => {
            let prefix = prefd[sd];
            data.properties.intros[prefix + "basecount"] = invc[data.properties.name] || 0;
        });
        svd.features.push(data);

        if (data.id) {
            sids[data.properties.name] = String(data.id);
        } else {
            data.id = String(id);
            sids[data.properties.name] = String(id);
            id++;
        }
    });

    svd.features.forEach(ftd => {
        let iid = ftd.properties.name;

        Object.entries(dovc).forEach(([sd, ovc]) => {
            let prefix = prefd[sd];
            let invOvc = Object.fromEntries(Object.entries(ovc).map(([k, subd]) => [k, subd[iid] || 0]));

            Object.entries(invOvc).forEach(([destination, count]) => {
                if (destination === "indeterminate") return;
                
                let did = sids[destination];
                ftd.properties.intros[prefix + "raw" + did] = count;
                if (count > 5) {
                    let sumin = dsumin[sd];
                    let invc = dinvc[sd];
                    let otvc = dotvc[sd];
                    ftd.properties.intros[prefix + did] = Math.log10(count * sumin / invc[destination] / otvc[iid]);
                } else {
                    ftd.properties.intros[prefix + did] = -0.5;
                }
            });
        });
    });

    return svd;
}

