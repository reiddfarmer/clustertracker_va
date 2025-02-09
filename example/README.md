# Customizing Calfornia Big Tree Cluster-Tracker
The code in this GitHub repo subdirectory generates a webpage displaying SARS-CoV-2 clusters and introductions inferred via [matUtils introduce](https://usher-wiki.readthedocs.io/en/latest/matUtils.html#introduce). In the version in this subdirectory, SARS-CoV-2 introductions between U.S. states are displayed geographically on an interactive map and in a separate table below the map, with links to view and explore the phylogenetic tree in [Taxonium](http://taxonium.org). 

**Approach:** This site uses Python to perform backend setup and vanilla JavaScript for website rendering. We use the protobuf file format to store mutation-annotated phylogentic tree information, and tab-separated text files (TSV) for metadata and text-based output files. In this version, Python scripts are used to take UCSC's [phylogenetic tree of public global SARS-CoV-2 sequences](https://hgdownload.soe.ucsc.edu/goldenPath/wuhCor1/UShER_SARS-CoV-2/), identify the region where the sequence originated (in this case, the U.S. state) of each sequence, and calculate introductions into each region. We use the [matUtils](https://usher-wiki.readthedocs.io/en/latest/matUtils.html) suite of tools for manipulating the protobuf files and calculating the introductions into each region. [TaxoniumTools](https://docs.taxonium.org/en/latest/taxoniumtools.html) is used to convert protobuf files to JSONL for use in the Taxonium viewer. We use the [Terra](https://terra.bio/) platform as our primary data pipeline, so our python scripts are modularized to be be compatible with WDL, but can also be run on the user's desktop computer. A [GeoJSON](https://geojson.org/) file with introductions for each region is created for input into a [Leaflet-based map](https://leafletjs.com/). JSON files supply a table below the map with cluster details.

**Customization:** Information on how to create a customized version of Cluster Tracker can be found [below](#customizing-cluster-tracker). A python script and a number of data files would be required to preprocess your data if you wish to use data not in the [global public SARS-CoV-2 phylogenetic tree](https://hgdownload.soe.ucsc.edu/goldenPath/wuhCor1/UShER_SARS-CoV-2/).

#### Contents

* [Screenshot and Features](#screenshot-and-features)
  * [Features](#features)
* [Quickstart](#quickstart)
  * Software Requirements
  * Input Data Files
  * [Quickstart Instructions](#quickstart-instructions)
* [Customizing Cluster Tracker](#customizing-cluster-tracker)
  * Software Requirements
  * Input File Requirements
  * Additional Considerations
  * General Steps
  * Running Each Step Sequentially
  * Customizations to the Cluster Table Below the Map
  * Customizing the Map--Basics
  * Customizing the Map--Advanced
  * Additional Notes

## Screenshot and Features

<img width="900" style="border: 1px solid gray;" alt="CA Big Tree Cluster Tracker 2022-09-16 screen shot" src="https://user-images.githubusercontent.com/67020823/234707621-3a007d12-6025-4810-a1bd-8b1349390a7e.png">

#### Features

* Displays on a map the total number of introductions into a region, and introductions from one region into another.
* Numbers of introductions can be displayed with log scaling applied or as actual numbers of introductions.
* Introductions on the map can be filtered to show just those from the past 3 months, past 6 months, past 12 months, or the whole pandemic.
* A table below the map displays information about clusters in the selected region and includes:
  * the number of samples in the cluster, the range of dates for the cluster, clade and lineage information, a list of potential origins for the cluster and an index value indicating the confidence associated with the potential origin, the cluster's growth score (an importance estimate based on cluster size and age)
  * a link to view the cluster in [Taxonium](http://taxonium.org)
  * all sample names in the cluster
* All data in the table can be sorted in ascending or descending order. Mulitple column sorting can be achieved by pressing the Shift key while clicking on a second column.
* A search tool allows the user to filter the table contents.
  * Search on one or more columns for text containing a search string. Multiple phrases can be searched for using logical "and" or "or" criteria.
  * The table can also be filtered by date range, cluster size, or growth score.
* Table data can be copied by selecting a range of table cells and using Ctrl-C to copy the contents to the computer's clipboard.
* The Taxonium JSONL file with phylogenetic tree information and a tab-separated file with information for all introductions can be downloaded for further analysis.

## Quickstart

Use this Quickstart guide to create a basic U.S.-based implementation of Cluster Tracker using public SARS-CoV-2 data.

**Software Requirements:** You will need to have the [UShER software suite](https://usher-wiki.readthedocs.io/en/latest/Installation.html) (version 0.6.2 or later) and [TaxoniumTools](https://docs.taxonium.org/en/latest/taxoniumtools.html) installed and available on your path. You should have python 3 installed on your computer. Verify that the python "dateutil" package is included as some versions of python may be missing the dateutil standard package; it can be installed if needed via conda.

**Input Data Files**

Use the following set of input files to create a basic implementation of Cluster Tracker.

| File | Description/Notes |
| --- | --- |
| MAT protobuf file | Should be compatible with [UShER](https://usher-wiki.readthedocs.io/en/latest/matUtils.html#the-mutation-annotated-tree-mat-protocol-buffer-pb). Download ["public-latest.all.masked.pb"](https://hgdownload.soe.ucsc.edu/goldenPath/wuhCor1/UShER_SARS-CoV-2/) to use with the processing scripts in the example directory. |
| Metadata file | Metadata file in TSV format. Download ["public-latest.metadata.tsv.gz"](https://hgdownload.soe.ucsc.edu/goldenPath/wuhCor1/UShER_SARS-CoV-2/) to use with the processing scripts in the example directory. |
| hu1.gb | Gene annotation file; can be downloaded [here](https://raw.githubusercontent.com/theosanderson/taxonium/master/taxoniumtools/test_data/hu1.gb). Used to produce a Taxonium view. |

### Quickstart Instructions
1. Clone this repository into your workspace of choice. (Note that "cdph" is the default branch for this repository; "main" is reserved for J. McBroome's original Cluster Tracker.)
2. Acquire the input data files and store in a directory that can be accesed from your workspace. Unzip the protobuf file and metadata file, if you downloaded the gzipped versions. (You can put these files in the "example/data" directory to simplify the data processing, if desired.)
3. Navigate to the "example/data" directory of this cloned repo, and run "prepare_us_states.py" with the files obtained above, a la the below.

```
cd example/data
python3 prepare_us_states.py -i path/to/public-latest.all.masked.pb -m path/to/public-latest.metadata.tsv -a path/to/hu1.gb -j us-states.geo.json -l state_lexicon.txt -r 0 -x “date,country,name,Nextstrain_clade_usher,pango_lineage_usher”
```

4. Copy the following files to a web-accessible folder: cluster_data.json.gz, sample_data.json.gz, cview.jsonl.gz, regions.js, hardcoded_clusters.tsv
5. Modify the [index.html](wwww/index.html) file (located in the "example/www" directory):
  * In the header:
    * Change the "dataHost" variable to the URL of your web-accessible directory from step 4.
    * If you are using your own Taxonium backend, change the "taxoniumHost" variable to the URL of your backend server. Be sure to prepend the URL with "backend=" and use URL escape codes to replace non-alphanumeric characters. (You may wish to set up your own Taxonium backend if the final phylogentic tree is very large. See the [documention](https://docs.taxonium.org/en/latest/advanced.html#deploying-your-own-taxonium-backend) in Taxonium for how to deploy your own backend.)
  * In the Downloads section, change the URL of the two download files ("hardcoded_clusters.tsv" and "cview.jsonl.gz") to the location from step 4.
  * At the bottom of the file, change the URL of the "regions.js" file to the location from step 4.
6. You can then view your results with a Python server initiated in the "example/www" directory.

```
cd ../www
python3 -m http.server
```

The website should be available at http://localhost:8000/ 

## Customizing Cluster Tracker

**Software Requirements:** You will need to have the [UShER software suite](https://usher-wiki.readthedocs.io/en/latest/Installation.html) (version 0.6.2 or later) and [TaxoniumTools](https://docs.taxonium.org/en/latest/taxoniumtools.html) installed and available on your path. You should have python 3 installed on your computer. Verify that the python "dateutil" package is included as some versions of python may be missing the dateutil standard package; it can be installed if needed via conda.

**Input File Requirements:**

* Mutation annotated protobuf file and corresponding metadata file. A gene annotation file is also required.
* To generate a website for your regions of interest, you will first need to obtain a [geojson]((https://geojson-maps.ash.ms)) formatted file representing your regions of interest. Region names should be specified with the "name" property. Each Feature should have an "id" property that can be used to identify the feature numerically. An example file can be found at [data/us-states.geo.json](data/us-states.geo.json).
* You will need to generate a sample-region two-column tsv, with sample identifiers in the first column and the name of the region they are from in the second column. Do not include a header row. Example:
```
USA/CA-CZB-9556/2020|MW483159.1|2020-04-13	California
USA/DC-DFS-PHL-0022/2020|MZ488067.1|2020-03-20	District of Columbia
USA/WV-QDX-1284/2020|MW065351.1|2020-03-17	West Virginia
...
```
* You will need what we're calling a "lexicon" file to ensure compatibility between region names--this is an unheaded CSV-formatted file containing in the first column the base name of each region to be used by the map, and comma separated after that, each other name for that region across your other files. An example is provided at [data/state_lexicon.txt](data/state_lexicon.txt).

**Additional Considerations:** The example in this directory takes advantage of the ability of the [Taxonium](https://taxonium.org/) phylogenetic tree visualization tool to display data hosted from any publicly available web location. If you want to link clusters in the data table to Taxonium directly, you to should put the Taxonium-formatted tree (cview.jsonl.gz) in a publicly available web location. Note that adding metadata fields to the tree can cause the file to become quite large, especially if you want to display the full global tree. In this case, you may want to think about [deploying your own Taxonium backend](https://docs.taxonium.org/en/latest/advanced.html#deploying-your-own-taxonium-backend). You can also use the desktop version of Taxonium, or if the tree isn't too large, upload the "cview.jsonl.gz" file using the "Choose Files" button at taxonium.org. From there, you can then grab the Cluster ID from the web app and search for it using Taxonium's search panel (select "Cluster" from the drop-down list). 

**General Steps**

1. The simplest way to start would be to clone this repository and edit the code in the example folder. Follow the instructions in the Quick Start section if you would like to start development from this simple example.

2. Gather the files mentioned in the Input File Requirements section above. If you need to preprocess your data, you can use [data/prepare_us_states.py](data/prepare_us_states.py) as a model. If you include the parse_setup method in your pre-processing script, you can use the same arguments you would with the main master_backend.py script. The California Big Tree Cluster Tracker has two data sources with two differently formatted metadata files, so if you have a second metadata file you can specify it with the -mx parameter as noted below.

3. Once you've obtained and/or created the required files, navigate to your data directory (e.g., example/data) and run:

```
python3 master_backend.py -i path/to/your.pb -m path/to/matching/metadata.tsv -a path/to/hu1.gb -j path/to/your/geo.json -s path/to/your/sample_regions.tsv -l path/to/your/lexicon.txt
```

You can optionally pass the following parameters to master_backend.py:
* -d: Path to a two-column tsv containing sample names and collection dates in YYYY-MM-DD format. matUtils can automatically determine the sample date if it as appended to the sample name with the pipe (|) character (e.g., "USA/CA-CZB-9556/2020|MW483159.1|2020-04-13"). If your sample names don't follow this naming convention, you can use the -d option to specify sample dates.
* -x: Comma-separated list of additional metadata fields to include in Taxonium protobuf. Default is 'cluster,region'. Use the name of the field in the metadata file. Do not separate items with spaces.
* -t: sets the number of threads to use when calling matUtils introduce; the default is 4.
* -X: Number to pass to parameter -X of matUtils introduce. Increase to merge nested clusters; the default is 2.
* -e: In our implementation for CDPH we use two sets of geojson files to handle two levels of geographic analysis, one at the county level and one at the state level. To differentiate the two sets of files we implemnted the -e option to append a filename "extension" to the second set of files, e.g., "default_clusters.tsv" for the county level analysis and "default_clusters**_us**.tsv" for the state level analysis. In this case you would use the -e paramater with "_us" as the parameter value. The default is to use no filename extension.
* -r: Report the top r scoring potential origins for each cluster. Set this to 0 to report all passing baseline.
* -T: Specifies the title to display in Taxonium. The default is "Cluster Tracker".
* -mx: If joining two datasets with two differently formatted metadata files, use this parameter to specify the name of the additional metadata file.

Note that the geojson parameter, -j, can take multiple arguments if you need to create a multi-geographic-level analysis, as we did for CDPH. If you use more than one geojson file, be sure to specify file name extensions using the -e parameter noted above.

Outputs:
* The primary data outputs contaning the calculated introductions are hardcoded_clusters.tsv (tab separated file with detailed cluster and introduction information) and cview.jsonl.gz (file for viewing introductions with Taxonium).
* The following set of files are used in the web site:
  * regions.js: This file supplies the geojson data to the Leaflet map (via the introData variable).
  * cluster_data.json.gz: This JSON-formateed file supplies the data table below the map with basic cluster information; it is pre-sorted by growth score. (The growth score is the number of samples in the cluster divided by the cluster's observed time frame; see the [matUtils introduce documentation](https://usher-wiki.readthedocs.io/en/latest/matUtils.html#introduce) for details.) 
  * sample_data.json.gz: This JSON-formateed file supplies the data table below the map with the sample names (and specimen IDs for CDPH data) in the final column(s) of the data table.
  * hardcoded_clusters.tsv: This is the cluster data file produced by matUtils introduce.
  * cview.jsonl.gz: This is the Taxonium-formatted phylogenetic tree. Each leaf is annotated with the metadata you supply in the -x parameter from step 3, as well as the cluster ID and region.

4. You will need to copy regions.js, cluster_data.json.gz, sample_data.json.gz, cview.jsonl.gz, and hardcoded_clusters.tsv into a web-accessible folder. 

5. Cluster Tracker is a single-page app, but you will still to make some slight edits to the main [index.html](www/index.html) page to point to where you copied the files in step 4:
  * In the header:
    * Change the "dataHost" variable to the URL of your web-accessible directory from step 4.
    * If you are using your own Taxonium backend, change the "taxoniumHost" variable to the URL of your backend server. Be sure to prepend the URL with "backend=" and use URL escape codes to replace non-alphanumeric characters. (You may wish to set up your own Taxonium backend if the final phylogentic tree is very large. See the [documention](https://docs.taxonium.org/en/latest/advanced.html#deploying-your-own-taxonium-backend) in Taxonium for how to deploy your own backend.)
  * In the Downloads section, change the URL of the two download files ("hardcoded_clusters.tsv" and "cview.jsonl.gz") to the location from step 4.
  * At the bottom of the file, change the URL of the "regions.js" file to the location from step 4.

6. If you would like to change any of the other features of Cluster Tracker you may do so. Our example web site has the following structure:
* index.html: the app's default home page
* css: contains the style sheets for the site; [gridstyles.css](www/css/gridstyles.css) controls the styles and popup for the data grid and [css/custom.css](www/css/custom.css) controls the styles for the rest of the page.
* scripts: contains the JS files that power the Leaflet map ([main.js](www/scripts/main.js)) and the table ([datagrid.js](www/scripts/datagrid.js)). The [ui_interactions.js](www/scripts/ui_interactions.js) controls a few interactions before the jQuery library loads.
* lib: contains the JS libraries used in the app: Leaflet JS, SlickGrid, jQuery, jQueryUI, Bootstrap, filter-multi-select, leaflet-gesture-handling, and sortablejs.

7. From the [www](www) directory run: 
```
python3 -m http.server
```
The website should be available at http://localhost:8000/ 

**Running Each Step Sequentially**

If you would like to run each step of the data processing sequentially. Use the steps below. Doing so can be helpful if you need to run matUtils introduce on a virtual machine with extra memory.

**Step 1. Preparing Metadata and Other Input Files to matUtils Introduce** 

You can use [prepare_us_states.py](data/prepare_us_states.py) (the section labeled step 1 in the python file) as a template to create the two column TSV file containing the sample names and associated region names. In our example this is called "sample_regions.tsv".

**Step 2. Running matUtils introduce to Calculate Introductions**

You will need a protobuf file with your phylogenetic tree (e.g., public-latest.all.masked.pb from the global public dataset) and the two-column TSV file associating samples and region names (e.g., "sample_regions.tsv" from step 1 above). Then run matUtils introduce using the following arguments:
```
matUtils introduce -i public-latest.all.masked.pb -s sample_regions.tsv -r 0 -u hardcoded_clusters.tsv
```
This produces "hardcoded_clusters.tsv," which lists all introductions to each region, with useful metrics such as growth score, and potential cluster origins. See the [matUtils introduce documentation](https://usher-wiki.readthedocs.io/en/latest/matUtils.html#introduce) for more information on this introductions file.

**Step 3: Generating the Leaflet GeoJSON Files**

Next you will need a GeoJSON file with your region boundaries, (e.g., [data/us-states.geo.json](data/us-states.geo.json)) the lexicon file to match up region names and abbreviations (e.g., [data/state_lexicon.txt](data/state_lexicon.txt)), and the introductions file created from step 2 (e.g., "hardcoded_clusters.tsv"). Run [data/update_js.py](data/update_js.py) using the following arguments:
```
python3 update_js.py -j us-states.geo.json -l state_lexicon.txt
```
This creates "regions.js" which supplies the Leaflet map with the introductions from each region to each region and has the region boundaries.

**Step 4: Generating Cluster Metric Data Table Files**

Next, we create the two JSON files for the data grid: "cluster_data.json.gz" for cluster metrics and "sample-data.json.gz" for the sample names for each cluster. The input is the "hardcoded_clusters.tsv" created from step 2. For this step, simply run [data/generate_display_tables.py](data/generate_display_tables.py) without any arguments:
```
python3 generate_display_tables.py
```
**Step 5: Getting the Metadata Ready for Taxonium**

This step appends the region name and cluster ID to the metadata file so that we can add information to each leaf of the phylogenetic tree and display it in Taxonium. The inputs are your metadata file (e.g., "public-latest.metadata.tsv" from the public global dataset), the sample-regions file from step 1 and the cluster file ("hardcoded_clusters.tsv") from step 2. Run [data/prepare_taxonium.py](data/prepare_taxonium.py) with the following arguments:
```
python3 prepare_taxonium.py -s sample_regions.tsv -m public-latest.metadata.tsv
```
The resulting metadata file is called "clusterswapped.tsv".

**Step 6: Generating the Taxonium JSONL File**

Finally, we annotate the phylogenetic tree with the cluster ID, region name, and any metadata fields desired. You will need the protobuf file (e.g., "public-latest.all.masked.pb" from the global public tree), the gene annotation file ("hu1.gb", avaialable at https://raw.githubusercontent.com/theosanderson/taxonium/master/taxoniumtools/test_data/hu1.gb), and the modified metadata file from step 5 ("clusterswapped.tsv"). Use [Taxonium Tools' usher_to_taxonium](https://docs.taxonium.org/en/latest/taxoniumtools.html) command with the following arguments:
```
usher_to_taxonium -i public-latest.all.masked.pb -o cview.jsonl.gz -g hu1.gb -m clusterswapped.tsv -c cluster,region,name -t "Cluster Tracker"
```
You can add more (or fewer) metadata fields to the -c parameter if desired (for the global public data set you could use "-c cluster,region,date,name,country,Nextstrain_clade_usher,pango_lineage_usher"). You can also add a title using the -t parameter.

**Customizations to the Cluster Table Below the Map:** Cluster Tracker uses the highly-customizeable [SlickGrid](http://slickgrid.net/) JS library to display cluster information below the map. Customizations to the table can be achieved by modifying [www/scripts/datagrid.js](www/scripts/datagrid.js); you may wish to consult the SlickGrid documentation for details. 

Our version for CDPH includes additional fields in the cluster table that are not automatically generated from matUtils introduce. To do likewise, you will need to modify the datagrid.js file to insert additional columns of data (the setCols function specifies column parameters) and modify how the data is read and assignd to the SlickGrid DataView object. 

**Customizing the Map--Basics:** We use [Leaflet.js](https://leafletjs.com/) for our mapping app, and largely built upon their [Interactive Choropleth Map example](https://leafletjs.com/examples/choropleth/). The [www/scripts/main.js](www/scripts/main.js) file is where you will find all the Leaflet map functions. Some common basic modifications you may wish to make:
* The map center, initial zoom level, and extent is set via the Leaflet setView method. In the header of [index.html](www/index.html) are two global variables: "mapCenter" stores the latitude and longitude coordinates to center the map on, and "mapInitialZoom" sets the inital zoom level. To change the maximum extent, modify the latitude and longitude coordinates of the "southWest" and "northEast" variables in [main.js](www/scripts/main.js); these two variables represent the southwest and northeast boundaries of the map, respectively.
* The color scale is set using the "map_colors" variable in [main.js](www/scripts/main.js).
* Color scale cut points can be modified in the getColor* methods and in the getBinVals and getLegendBins methods in [main.js](www/scripts/main.js).

**Customizing the Map--Advanced:** Additional map customizations can be found in our customization for CDPH, located in the "cdph" folder. Of interest, we developed a toggle that can switch between a county-based view of introducions and a larger state-based view of introductions. This can be achieved by using Leaflet's Layer method.

**Additional Notes:** Modern browsers tend to cache files to make loading the website quicker. If your data files will be updated with regularity you may want to consider setting up your server so that it prevents cacheing.
