//Reassign centering of the map to state of Interest
var stateGeographicalCenters = {
    "Alabama": [32.806671, -86.791130],
    "Alaska": [61.370716, -152.404419],
    "Arizona": [33.729759, -111.431221],
    "Arkansas": [34.969704, -92.373123],
    "California": [36.116203, -119.681564],
    "Colorado": [39.059811, -105.311104],
    "Connecticut": [41.597782, -72.755371],
    "Delaware": [39.318523, -75.507141],
    "Florida": [27.766279, -81.686783],
    "Georgia": [33.040619, -83.643074],
    "Hawaii": [21.094318, -157.498337],
    "Idaho": [44.240459, -114.478828],
    "Illinois": [40.349457, -88.986137],
    "Indiana": [39.849426, -86.258278],
    "Iowa": [42.011539, -93.210526],
    "Kansas": [38.526600, -96.726486],
    "Kentucky": [37.668140, -84.670067],
    "Louisiana": [31.169546, -91.867805],
    "Maine": [44.693947, -69.381927],
    "Maryland": [39.063946, -76.802101],
    "Massachusetts": [42.230171, -71.530106],
    "Michigan": [43.326618, -84.536095],
    "Minnesota": [45.694454, -93.900192],
    "Mississippi": [32.741646, -89.678696],
    "Missouri": [38.456085, -92.288368],
    "Montana": [46.921925, -110.454353],
    "Nebraska": [41.125370, -98.268082],
    "Nevada": [38.313515, -117.055374],
    "New Hampshire": [43.452492, -71.563896],
    "New Jersey": [40.298904, -74.521011],
    "New Mexico": [34.840515, -106.248482],
    "New York": [42.165726, -74.948051],
    "North Carolina": [35.630066, -79.806419],
    "North Dakota": [47.528912, -99.784012],
    "Ohio": [40.388783, -82.764915],
    "Oklahoma": [35.565342, -96.928917],
    "Oregon": [44.572021, -122.070938],
    "Pennsylvania": [40.590752, -77.209755],
    "Rhode Island": [41.680893, -71.511780],
    "South Carolina": [33.856892, -80.945007],
    "South Dakota": [44.299782, -99.438828],
    "Tennessee": [35.747845, -86.692345],
    "Texas": [31.054487, -97.563461],
    "Utah": [40.150032, -111.862434],
    "Vermont": [44.045876, -72.710686],
    "Virginia": [37.769337, -78.169968],
    "Washington": [47.400902, -121.490494],
    "West Virginia": [38.491226, -80.954456],
    "Wisconsin": [44.268543, -89.616508],
    "Wyoming": [42.755966, -107.302490],
    "District of Columbia": [38.897438, -77.026817]
};
const newMapCenter = stateGeographicalCenters["Kansas"];
const map = window.map = L.map('mapid', {'tap': false, 'gestureHandling': true}).setView(L.latLng(newMapCenter), mapInitialZoom);

// set max zoomed out extent via bounds and minZoom
const southWest = L.latLng(-90, -179);
const northEast = L.latLng(90, 0);
const bounds = L.latLngBounds(southWest, northEast);
map.setMaxBounds(bounds);
map.options.minZoom = 2;

let global_state = 'default';
let global_time = '';
let global_state_id = '00';
let map_colors = ['#800026', '#BD0026', '#E31A1C', '#FC4E2A', '#FD8D3C', '#FEB24C', '#FED976', '#FFEDA0'];
let color_scale = 'log';
let map_layer = 0; //0=county data, 1=state data

// Relocated following code to recalulate.js
// let alldata =[introData, introData_us];
// let max_basecount = [0,0];
// for (j = 0; j < 2; j++) {
//     for (i = 0; i < alldata[j].features.length; i++) {
//         let bc = alldata[j].features[i]['properties']['intros']['basecount'];
//         if (bc > max_basecount[j]) {
//             max_basecount[j] = bc;
//         }
//     }
// }


function maxClusterCt(region_id,timel,map_layer) {
    let maxn = 0;
    let item = timel + 'raw' + region_id;
    for (i = 0; i < alldata[map_layer].features.length; i++) {
        let c = alldata[map_layer].features[i]['properties']['intros'][item];
        if (c > maxn) {
            maxn = c;
        }
    }
    return maxn;
}

function getColorBase(d,map_layer) {
    return d > max_basecount[map_layer] * 0.9 ? map_colors[0] :
           d > max_basecount[map_layer] * 0.75   ? map_colors[1] :
           d > max_basecount[map_layer] * 0.5   ? map_colors[2] :
           d > max_basecount[map_layer] * 0.25   ? map_colors[3] :
           d > max_basecount[map_layer] * 0.1    ? map_colors[4] :
           d > max_basecount[map_layer] * 0.05   ? map_colors[5] :
           d > max_basecount[map_layer] * 0.01    ? map_colors[6] :
                      map_colors[7];
}

function getColorIntroN(d, max) {
    return d > max * 0.9  ? map_colors[0] :
           d > max * 0.75 ? map_colors[1] :
           d > max * 0.5  ? map_colors[2] :
           d > max * 0.25 ? map_colors[3] :
           d > max * 0.1  ? map_colors[4] :
           d > max * 0.05 ? map_colors[5] :
           d > max * 0.01 ? map_colors[6] :
                      map_colors[7];
}

function getColorBin(d, max) {
    return d > max * 0.9  ? '1' :
           d > max * 0.75 ? '2' :
           d > max * 0.5  ? '3' :
           d > max * 0.25 ? '4' :
           d > max * 0.1  ? '5' :
           d > max * 0.05 ? '6' :
           d > max * 0.01 ? '7' :
                      '8';
}

function getColorIntro(d) {
    return d > 1 ? map_colors[0] :
        d > 0.75  ? map_colors[1] :
        d > 0.5  ? map_colors[2] :
        d > 0.25  ? map_colors[3] :
        d > 0   ? map_colors[4] :
        d > -0.25   ? map_colors[5] :
        d > -0.5   ? map_colors[6] :
                    map_colors[7];
}

function setTimeLabels(sel) {
    const el1 = document.getElementById('chk_time_0');
    const el2 = document.getElementById('chk_time_12');
    const el3 = document.getElementById('chk_time_6');
    const el4 = document.getElementById('chk_time_3');
    if (sel == 0) {
        //whole pandemic
        el1.innerHTML = 'check';
        el2.innerHTML = '';
        el3.innerHTML = '';
        el4.innerHTML = '';
    } else if (sel == 12) {
        //last 12 months
        el1.innerHTML = '';
        el2.innerHTML = 'check';
        el3.innerHTML = '';
        el4.innerHTML = '';
    } else if (sel == 6) {
        //last 6 months
        el1.innerHTML = '';
        el2.innerHTML = '';
        el3.innerHTML = 'check';
        el4.innerHTML = '';
    } else if (sel == 3) {
        //last 3 months
        el1.innerHTML = '';
        el2.innerHTML = '';
        el3.innerHTML = '';
        el4.innerHTML = 'check';
    }
}

function style(feature) {
    return {
        fillColor: getColorBase(feature.properties.intros[global_time + 'basecount'], map_layer),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}


L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?{foo}', {foo: 'bar', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);

// Relocated following code to recalulate.js
// var geojson = [];
// geojson[0] = L.geoJson(alldata[0], {
//     style: style,
//     onEachFeature: onEachFeature
// });
// map.addLayer(geojson[0]);
// geojson[1] = L.geoJson(alldata[1], {
//     style: style,
//     onEachFeature: onEachFeature
// });


//control to display data for each region on hover
var info = window.info = L.control();

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
    this.update();
    return this._div;
};

// method to update the info panel control based on feature properties passed
info.update = function (props) {
    deftext = ' - Hover over a county or state';
    if (global_state == 'default') {
        // total number of clusters
        str = '<h4># Clusters '
        if (props) {
            countval = props.intros[global_time + 'basecount'];
            str += ' in <b>' + props.name + '</b><br />' + countval;
        } else {
            str += deftext;
        }
    } else {
        // number of introductions into region from another region
        str = '<h4># Introductions to ' + global_state 
        if (props) {
            keyval = global_time + 'raw' + global_state_id;
            if (keyval in props.intros){
                countval = props.intros[keyval];
            } else {
                countval = 0;
            }
            str += ' from <b>' + props.name + '</b><br />' + countval;
        } else {
            str += deftext;
        }
    }
    this._div.innerHTML = str;
};

function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
    info.update(layer.feature.properties);
}

function resetHighlight(e) {
    //geojson.resetStyle(e.target);
    e.target.setStyle({
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    })
    info.update();
}

function resetView(e) {
    geojson[map_layer].eachLayer(function (layer) {
        geojson[map_layer].resetStyle(layer);
    });
    global_state = 'default';
    global_state_id = '00';
    var btn = document.getElementById('colorbtn');
    btn.disabled = true;
    btn.innerText = 'Show Raw Cluster Count';
    color_scale = 'log';
    legend.update(global_state);
    showRegion(global_state);
}

function changeMap(time) {
    setTimeLabels(time);
    if (time == 0) {
        //reset to default
        global_time = '';
    } else {
        global_time = time + '_';
    }
    if (global_state != 'default') {
        geojson[map_layer].eachLayer(function (layer) {
            if (layer.feature.id == global_state_id) {
                layer.setStyle({fillColor: '#1a0080'});
            } else {
                colorIntros();
            }
        });
    } else {
        resetView();
    }
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

function changeView(e) {
    //code to change the displayed heatmaps to the matching intro index
    var clicklayer = e.target;
    if (e.target.options.fillColor == '#1a0080') {
        resetView(e);
    } else {
        global_state = e.target.feature.properties.name;
        global_state_id = e.target.feature.id;
        clicklayer.setStyle({fillColor: '#1a0080'});
        colorIntros();
        document.getElementById('colorbtn').disabled = false;
        legend.update(global_state);
        showRegion(global_state);
    }
}

function colorIntros() {
    if (color_scale == 'raw') {
        //find max number of clusters
        let maxn = maxClusterCt(global_state_id,global_time,map_layer);
        //set colors
        geojson[map_layer].eachLayer(function (layer) {
            if (layer.feature.id != global_state_id) {
                layer.setStyle({fillColor: getColorIntroN(layer.feature.properties.intros[global_time + 'raw' + global_state_id],maxn)});
            }
        });
    } else {
        //set colors
        geojson[map_layer].eachLayer(function (layer) {
            if (layer.feature.id != global_state_id) {
                layer.setStyle({fillColor: getColorIntro(layer.feature.properties.intros[global_time + global_state_id])});
            }
        });
    }
    // update legend
    legend.update(global_state);
}

function changeScale() {
    var btn = document.getElementById('colorbtn');
    if (color_scale == 'log') {
        color_scale = 'raw';
        btn.innerText = 'Show Log Fold Enrichment';
        colorIntros();
    } else {
        color_scale = 'log';
        btn.innerText = 'Show Raw Cluster Count';
        colorIntros();
    }
}

function swap_countystate() {
    var btn = document.getElementById('btn_SC');
    color_scale = 'log';
    global_state = 'default';
    global_time = '';
    setTimeLabels(0);
    if (btn.innerHTML == 'Show VA State Introductions') {
        btn.innerHTML = 'Show VA County Introductions';
        map.removeLayer(geojson[0]);
        map.addLayer(geojson[1]);
        map_layer = 1;
    } else {
        btn.innerHTML = 'Show VA State Introductions';
        map.removeLayer(geojson[1]);
        map.addLayer(geojson[0]);
        map_layer = 0;
    }
    resetView();
    // load new dataset into grid
    let df = cDataFile;
    let ds = cSampleFile;
    if (map_layer == 1) {
        const ext = '_us';
        let pos = cDataFile.length - 8;
        df = cDataFile.substring(0, pos) + ext + cDataFile.substring(pos);
        pos = cSampleFile.length - 8;
        ds = cSampleFile.substring(0, pos) + ext + cSampleFile.substring(pos);
    }
    initCTGrid(dataHost, taxoniumHost, df, ds);
}

var legend = L.control({position: 'bottomleft'});

legend.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info legend'); // create a div with a class "info lengend"
    this.update(global_state);
    return this._div;
};

function getBinVals(grades, max) {
    var threshold = 0;
    var bins = {start:[0, 0, 0, 0, 0, 0, 0, 0],stop:[0, 0, 0, 0, 0, 0, 0, 0]};
    for (var i = 0; i < grades.length; i++) {
        threshold = max * grades[i];
        if(((threshold%1)===0) && (threshold != 0)) {
            // integer not equal to zero
            bins.start[i] = threshold + 1;
        } else {
                bins.start[i] = Math.ceil(threshold);
        }
        if (i == 0) {
            bins.stop[i] = max;
        } else {
            bins.stop[i] = bins.start[i-1] - 1;
        }
    }
    return bins;
}
function getLegendBins(max) {
    var ltext = '';
    // cut points for creating color bins
    const grades = [0.9, 0.75, 0.5, 0.25, 0.1, 0.05, 0.01, 0];
    var threshold = 0;
    var bins = {start:[0, 0, 0, 0, 0, 0, 0, 0],stop:[0, 0, 0, 0, 0, 0, 0, 0]};
    for (var i = 0; i < grades.length; i++) {
        threshold = max * grades[i];
        if(((threshold%1)===0) && (threshold != 0)) {
            // integer not equal to zero
            bins.start[i] = threshold + 1;
        } else {
                bins.start[i] = Math.ceil(threshold);
        }
        if (i == 0) {
            bins.stop[i] = max;
        } else {
            bins.stop[i] = bins.start[i-1] - 1;
        }
    }
    // loop through the bin cut points and generate a label with a colored square for each interval
    for (var i = 0; i < grades.length; i++) {
        if (bins.start[i] <= bins.stop[i]) {
            ltext += '<i style="background:' + map_colors[i] + '"></i> '
            if (bins.start[i] == bins.stop[i]) {
                ltext += bins.stop[i]  + '<br>';
            } else {
                ltext += bins.start[i] + '&ndash;' + bins.stop[i] + '<br>';
            }
        }
    }
    return ltext;
}

// legend for US clusters
// Relocated following code to recalulate.js
// const legend_default = '<strong>Number of Clusters</strong><br>' +
//         getLegendBins(max_basecount[0]);
// legend for log fold enrichment
const legend_log = '<strong>Introductions</strong><br>'+
         '<small>Log<sub>10</sub>fold enrichment</small><br>' + 
         '<i style="background:#800026"></i>high<br>' +
         '<i style="background:#BD0026"></i><br>' +
         '<i style="background:#E31A1C"></i><br>' +
         '<i style="background:#FC4E2A"></i><br>' +
         '<i style="background:#FD8D3C"></i><br>' +
         '<i style="background:#FEB24C"></i><br>' +
         '<i style="background:#FED976"></i><br>' +
         '<i style="background:#FFEDA0"></i>low' +
         '<br><br><i style="background:#1a0080"></i>Focal Region';


// method to update the legend control based on feature properties passed
legend.update = function (props) {
    var ltext = '';
    if (props != 'default') {
        if (color_scale == 'raw') {
            //show number of clusters
            let maxn = maxClusterCt(global_state_id,global_time,map_layer);
            ltext = '<strong>Number of<br>Introductions</strong><br>';
            ltext += getLegendBins(maxn);
            ltext += '<br><i style="background:#1a0080"></i>Focal Region';
        } else {
            //log fold enrichment
            ltext = legend_log;
        }
    } else {
        ltext = legend_default;
    }
    this._div.innerHTML = ltext;
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: changeView
    });
}
// Relocated following code to recalulate.js
// info.addTo(map);
// legend.addTo(map);

