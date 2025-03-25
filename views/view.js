import * as Lookout from '../lookout.js' ;
import { timelineDates } from '../util.js';

// This base class doesn't do much at the moment. It's a placeholder
// to show what functions should be implemented by each View.

export class View {
    container;


    constructor() {
        // create the container object and add to the DOM
    }


    updateSelection(selectionIndex, selectionCount) {
    }


    setVisible(visible) {
        // this.container.style.display = visible ? 'block' : 'none';
        this.container.style.display = visible ? 'flex' : 'none';
    }

    updateSelectionDisplay(dateRangeSpan, selectionIndex, selectionCount) {
      const startDate = Lookout.days[selectionIndex];
      const dateRange = timelineDates(startDate, selectionCount);
      dateRangeSpan.textContent = `${dateRange[0]}-${dateRange[1]}`;
    }

    updateGeoDisplay(siteSpan, geo, geoName) {
      const selectedGeo = Lookout.getSelectedGeo();
      if (selectedGeo === geo || !selectedGeo) {
        siteSpan.textContent = selectedGeo ? geoName : Lookout.site.site;
      }
    }

    updateCaseCountDisplay(caseCountSpan, selectionIndex, selectionCount) {
      const numPositive = Lookout.cases.positive.slice(selectionIndex, selectionIndex + selectionCount).reduce((sum, day) => sum + day.length, 0);
      caseCountSpan.textContent = `${numPositive} total case${numPositive === 1 ? '' : 's'}`
    }

}
