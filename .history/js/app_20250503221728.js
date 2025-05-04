/**
 * Main application controller for the Account Deployment Dashboard
 * Coordinates between data, chart, and UI services
 */
const app = {
    // Current view mode ('raw' or 'fte')
    currentViewMode: 'raw',

    /**
     * Initialize the application
     */
    init: function() {
        if (config.debug) {
            console.log("[LOG] Entering app.init"); // Added Log
        }

        // Initialize UI
        uiService.init();

        // Initialize dashboard container visibility
        const dashboardContainer = document.getElementById('dashboardContainer');
        if (dashboardContainer) {
            // Initially hidden
            dashboardContainer.style.display = 'none';
        }
        if (config.debug) {
            console.log("[LOG] Exiting app.init"); // Added Log
        }
    },

    /**
     * Load Excel file
     * @param {File} file - Excel file to load
     * @returns {Promise} Promise resolving when file is loaded
     */
    loadFile: function(file) {
        console.log(`[LOG] Entering app.loadFile: ${file.name}`); // Added Log

        // Make sure we return the Promise with data
        return dataService.loadExcelFile(file)
            .then(data => {
                console.log(`[LOG] DataService.loadExcelFile promise resolved in app.loadFile. Records loaded: ${data ? data.length : 'unknown'}`); // Added Log

                // Populate filters
                console.log("[LOG] Calling uiService.populateFilters..."); // Added Log
                uiService.populateFilters(dataService.filterOptions);
                console.log("[LOG] uiService.populateFilters finished."); // Added Log

                // Refresh charts
                console.log("[LOG] Calling app.refreshCharts..."); // Added Log
                this.refreshCharts();
                console.log("[LOG] app.refreshCharts finished."); // Added Log

                // Apply initial filters to show all data
                console.log("[LOG] Calling app.applyFilters for initial display..."); // Added Log
                this.applyFilters();
                console.log("[LOG] app.applyFilters (initial) finished."); // Added Log


                console.log(`[LOG] Exiting app.loadFile (success)`); // Added Log
                // Return the data for further promise chaining
                return data;
            })
            .catch(error => {
                console.error("[LOG] Error in app.loadFile:", error); // Added Log
                console.log(`[LOG] Exiting app.loadFile (with error)`); // Added Log
                throw error; // Propagate the error
            });
    },

    /**
     * Toggle between raw count and FTE views
     */
    toggleCountType: function() {
        console.log("[LOG] Entering app.toggleCountType"); // Added Log
        const rawRadio = document.getElementById('rawCountRadio');
        const fteRadio = document.getElementById('fteCountRadio');

        // Check which radio button is selected
        if (rawRadio && rawRadio.checked) {
            this.currentViewMode = 'raw';
        } else if (fteRadio && fteRadio.checked) {
            this.currentViewMode = 'fte';
        }

        console.log(`[LOG] Switched to ${this.currentViewMode} view mode`);

        // Update UI elements
        console.log("[LOG] Calling uiService.updateViewElements..."); // Added Log
        uiService.updateViewElements(this.currentViewMode);
        console.log("[LOG] uiService.updateViewElements finished."); // Added Log

        // Refresh charts and table
        console.log("[LOG] Calling app.refreshCharts after toggle..."); // Added Log
        this.refreshCharts();
        console.log("[LOG] app.refreshCharts after toggle finished."); // Added Log

        console.log("[LOG] Calling app.applyFilters after toggle..."); // Added Log
        this.applyFilters();
        console.log("[LOG] app.applyFilters after toggle finished."); // Added Log

        console.log("[LOG] Exiting app.toggleCountType"); // Added Log
    },

    /**
     * Apply filters and update results table
     */
    applyFilters: function() {
        console.log("[LOG] Entering app.applyFilters"); // Added Log
        const filters = uiService.getFilterValues();

        if (config.debug) {
            console.log("[LOG] Applying filters:", filters); // Added Log
        }

        // Filter data
        console.log("[LOG] Calling dataService.filterData..."); // Added Log
        const filteredData = dataService.filterData(filters);
        console.log(`[LOG] dataService.filterData finished. Filtered records: ${filteredData.length}`); // Added Log

        // Update results table
        console.log("[LOG] Calling uiService.updateResultsTable..."); // Added Log
        uiService.updateResultsTable(filteredData, this.currentViewMode);
        console.log("[LOG] uiService.updateResultsTable finished."); // Added Log

        console.log("[LOG] Exiting app.applyFilters"); // Added Log
    },

    /**
     * Refresh charts based on current view mode
     */
    refreshCharts: function() {
        console.log("[LOG] Entering app.refreshCharts"); // Added Log
        try {
            console.log(`[LOG] Calling dataService.getDataForViewMode for ${this.currentViewMode} view mode...`); // Added Log
            const { accountData, brandData } = dataService.getDataForViewMode(this.currentViewMode);
            console.log(`[LOG] dataService.getDataForViewMode finished. Account data size: ${Object.keys(accountData).length}, Brand data size: ${Object.keys(brandData).length}`); // Added Log


            if (config.debug) {
                console.log(`[LOG] Refreshing charts for ${this.currentViewMode} view mode`);
            }

            // Create account chart
            console.log("[LOG] Calling chartService.createAccountChart..."); // Added Log
            chartService.createAccountChart(accountData, this.currentViewMode);
            console.log("[LOG] chartService.createAccountChart finished."); // Added Log


            // Create technology breakdown chart
            console.log("[LOG] Calling chartService.createTechnologyChart..."); // Added Log
            chartService.createTechnologyChart(brandData, this.currentViewMode);
            console.log("[LOG] chartService.createTechnologyChart finished."); // Added Log

            console.log("[LOG] Exiting app.refreshCharts (success)"); // Added Log

        } catch (error) {
            console.error("[LOG] Error refreshing charts:", error); // Added Log
            // Display error message in charts if possible
            const accountsChart = document.getElementById('accountsChart');
            const technologiesChart = document.getElementById('technologiesChart');

            if (accountsChart) {
                accountsChart.innerHTML = '<div class="alert alert-danger">Error rendering chart</div>';
            }

            if (technologiesChart) {
                technologiesChart.innerHTML = '<div class="alert alert-danger">Error rendering chart</div>';
            }
            console.log("[LOG] Exiting app.refreshCharts (with error)"); // Added Log
        }
    },

    /**
     * Show details for a specific account
     * @param {string} accountName - Account name
     */
    showAccountDetails: function(accountName) {
        console.log(`[LOG] Entering app.showAccountDetails for account: ${accountName}`); // Added Log
        if (config.debug) {
            console.log(`[LOG] Loading details for account: ${accountName}`);
        }

        // Show loading state
        console.log("[LOG] Calling uiService.showAccountDetailsLoading..."); // Added Log
        uiService.showAccountDetailsLoading(accountName);
        console.log("[LOG] uiService.showAccountDetailsLoading finished."); // Added Log


        try {
            // Get account details
            console.log("[LOG] Calling dataService.getAccountDetails..."); // Added Log
            const accountData = dataService.getAccountDetails(accountName, this.currentViewMode);
            console.log(`[LOG] dataService.getAccountDetails finished for ${accountName}. Total people: ${accountData.total_people}`); // Added Log


            // Display account details
            console.log("[LOG] Calling uiService.displayAccountDetails..."); // Added Log
            uiService.displayAccountDetails(accountData, this.currentViewMode);
            console.log("[LOG] uiService.displayAccountDetails finished."); // Added Log

            console.log(`[LOG] Exiting app.showAccountDetails (success)`); // Added Log

        } catch (error) {
            console.error("[LOG] Error in app.showAccountDetails:", error); // Added Log
            uiService.showAccountDetailsError(accountName, error);
            console.log(`[LOG] Exiting app.showAccountDetails (with error)`); // Added Log
        }
    }
};

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("[LOG] DOMContentLoaded event fired."); // Added Log
    app.init();
});