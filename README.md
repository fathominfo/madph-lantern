# Getting Started

## Run the App


Clone this repository:

```
git clone git@github.com:fathominfo/madph-lantern.git
cd madph-lantern
```
and then double click the `./server.tool`. This will launch a webserver in a terminal window, and open the app in a browser window.

## What's going on:

The demo version displays simulated data for tracking salmonella. In addition to demonstrating the application's functionality, this simulated data is an example of how to structure data for us with the app.

The configuration of the application is located in the `salmonella` subfolder. The key file is `salmonella/site.json`, which contains information on what data to include, how to layout the page, as well as labeling information.

The data files are located in the  `salmonella/data` subfolder. There are several core files that are always required, and some that are optional and tailored to this particular configuration. The required files are fetched directly by the core of the application. These are
* `records.json` is an array that has details about every case in the app. Other files refer to these records according to their position within the array.
* `days.json` is an array of all the dates within the time range of the app.
*  `cases.json`, `geography.json`, `pathogen.json` are also required, and follow a similar pattern. Each contains arrays of arrays. The outer array corresponds to the days in `days.json`. For each day, there is an array of the records for that day, indicated by the index positon in the `records.json` file. Several of these arrays of cases by day can be in the same file:
  * In `cases.json`, the cases by day are organized by whether the case tested positive or is merely suspected.
  * In `geography.json`, the entries are sorted into counties that are found in the data, and those that are missing. The ones that have been found each have a corresponding set of cases by day.
  * In `pathogens.json`, there is only one set of cases, since this configuration only handles a single pathogen. However, the app can be configured for multiple pathogens.

The remaining files in the `salmonell/data` subfolder are included to support specific charts in the app:
* `dist_mat.json` contains a distance matrix that is used to dynamically generate the phylogenetic trees.
* `cluster_types.json` contains data to annotate the source of a cluster.
Each of these files are set up in `site.json`.


Please reach out to hello at fathom dot info with questions or comments.
