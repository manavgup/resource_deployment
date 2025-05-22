/**
 * Main application controller for the Account Deployment Dashboard
 * Coordinates between data, chart, and UI services
 */
const app = {
    // Current view mode (always 'fte' since we removed the radio buttons)
    currentViewMode: 'fte',

    /**
      * Initialize the application
      * Attempts to load pre-defined sample data first.
      */
     init: async function() { // Make init async to handle fetch
         if (config.debug) {
             console.log("[LOG] Entering app.init"); // Added Log
         }
 
         // Initialize UI elements (like file input listeners) regardless of data loading
         uiService.init();
 
         // Attempt to load sample data
         try {
             let sampleData = null;
             if (window.SAMPLE_DATA && Array.isArray(window.SAMPLE_DATA) && window.SAMPLE_DATA.length > 0) {
                 console.log("[LOG] Using embedded SAMPLE_DATA for pre-loaded view.");
                 sampleData = window.SAMPLE_DATA;
             } else {
                 // Fallback: try to fetch (for future-proofing, but not expected to work locally)
                 console.log("[LOG] No embedded SAMPLE_DATA found, attempting to fetch data/sample_data.json...");
                 const response = await fetch('data/sample_data.json');
                 if (!response.ok) {
                     throw new Error(`HTTP error! status: ${response.status}`);
                 }
                 sampleData = await response.json();
                 console.log(`[LOG] Successfully fetched sample data (${sampleData.length} records).`);
             }

             // Load the sample data using dataService
             const loaded = dataService.loadJsonData(sampleData);

             if (loaded) {
                 console.log("[LOG] Sample data loaded and processed successfully.");
                 // Populate filters based on sample data
                 console.log("[LOG] Calling uiService.populateFilters with sample data options...");
                 uiService.populateFilters(dataService.filterOptions);
                 console.log("[LOG] uiService.populateFilters finished.");

                 // Refresh charts with sample data
                 console.log("[LOG] Calling app.refreshCharts with sample data...");
                 this.refreshCharts();
                 console.log("[LOG] app.refreshCharts finished.");

                 // Initialize Sankey visualization first
                 console.log("[LOG] Initializing Sankey visualization with sample data...");
                 sankeyVisualization.init(sampleData);
                 console.log("[LOG] Sankey visualization initialized.");

                 // Apply initial filters (show all sample data)
                 console.log("[LOG] Calling app.applyFilters for initial sample data display...");
                 this.applyFilters();
                 console.log("[LOG] app.applyFilters (initial) finished.");

                 // Make dashboard visible
                 uiService.showDashboardContainer();

             } else {
                 console.warn("[LOG] Sample data present but failed to load/process in dataService.");
                 // Keep dashboard hidden, rely on user upload
                 uiService.hideDashboardContainer();
             }

         } catch (error) {
             console.warn("[LOG] Failed to load or process sample data:", error);
             // Sample data not available or failed to load, keep dashboard hidden
             // The user will need to upload a file.
             uiService.hideDashboardContainer();
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

                // Initialize Sankey visualization first
                console.log("[LOG] Initializing Sankey visualization..."); // Added Log
                sankeyVisualization.init(data);
                console.log("[LOG] Sankey visualization initialized."); // Added Log

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

        // Update Sankey visualization with filtered data
        console.log("[LOG] Updating Sankey visualization with filtered data..."); // Added Log
        if (filters.account) {
            sankeyVisualization.updateVisualization(filters.account);
            // Sync with Sankey account filter
            const sankeyAccountFilter = document.getElementById("accountFilterSankey");
            if (sankeyAccountFilter && sankeyAccountFilter.value !== filters.account) {
                sankeyAccountFilter.value = filters.account;
            }
        } else {
            sankeyVisualization.updateVisualization("");
            // Sync with Sankey account filter
            const sankeyAccountFilter = document.getElementById("accountFilterSankey");
            if (sankeyAccountFilter && sankeyAccountFilter.value !== "") {
                sankeyAccountFilter.value = "";
            }
        }
        console.log("[LOG] Sankey visualization updated."); // Added Log

        // If a person filter is applied, show person details
        if (filters.person && filters.person.trim() !== '') {
            console.log(`[LOG] Person filter applied: ${filters.person}. Showing person details.`);
            this.showPersonDetails(filters.person);
        } else {
            // Hide person details panel if no person filter is applied
            const personDetailPanel = document.getElementById('personDetailPanel');
            if (personDetailPanel) {
                personDetailPanel.style.display = 'none';
            }
        }

        console.log("[LOG] Exiting app.applyFilters"); // Added Log
    },

    /**
     * Refresh charts based on the processed data
     */
    refreshCharts: function() {
        console.log("[LOG] Entering app.refreshCharts"); // Added Log
        try {
            // Get both unique people count and FTE data directly from dataService properties
            const uniquePeopleCountData = dataService.accountUniquePeopleCount;
            const fteAccountData = dataService.accountFTE; // FTE data for the second chart (if needed, currently using brand FTE)
            const fteBrandData = dataService.brandFTEByAccount; // FTE data aggregated by brand for the second chart

            console.log(`[LOG] Fetched data for charts. Unique People: ${Object.keys(uniquePeopleCountData).length} accounts, FTE Accounts: ${Object.keys(fteAccountData).length} accounts, FTE Brands: ${Object.keys(fteBrandData).length} accounts`); // Added Log

            if (config.debug) {
                console.log(`[LOG] Refreshing charts with specific data sets.`);
            }

            // Create account chart (using unique people count)
            console.log("[LOG] Calling chartService.createAccountChart with unique people count data..."); // Added Log
            // Pass 'unique_count' as the mode identifier for labeling purposes
            chartService.createAccountChart(uniquePeopleCountData, 'unique_count');
            console.log("[LOG] chartService.createAccountChart finished."); // Added Log


            // Create technology breakdown chart (using FTE data)
            console.log("[LOG] Calling chartService.createTechnologyChart with FTE data..."); // Added Log
            // Pass 'fte' as the mode identifier for labeling purposes
            chartService.createTechnologyChart(fteBrandData, 'fte');
            console.log("[LOG] chartService.createTechnologyChart finished."); // Added Log
            
            // Create quota chart if quota data is available
            if (dataService.hasQuota()) {
                console.log("[LOG] Quota data available. Creating quota chart...");
                const quotaChartCard = document.getElementById('quotaChartCard');
                if (quotaChartCard) {
                    quotaChartCard.style.display = 'block';
                }
                
                const accountQuotas = quotaService.getAllAccountQuotas();
                quotaChartService.createAccountQuotaChart(accountQuotas);
                console.log("[LOG] Quota chart created.");
            } else {
                console.log("[LOG] No quota data available. Hiding quota chart.");
                const quotaChartCard = document.getElementById('quotaChartCard');
                if (quotaChartCard) {
                    quotaChartCard.style.display = 'none';
                }
            }

            console.log("[LOG] Exiting app.refreshCharts (success)"); // Added Log

        } catch (error) {
            console.error("[LOG] Error refreshing charts:", error); // Added Log
            // Display error message in charts if possible
            const accountsChart = document.getElementById('accountsChart');
            const technologiesChart = document.getElementById('technologiesChart');
            const accountQuotaChart = document.getElementById('accountQuotaChart');

            if (accountsChart) {
                accountsChart.innerHTML = '<div class="alert alert-danger">Error rendering chart</div>';
            }

            if (technologiesChart) {
                technologiesChart.innerHTML = '<div class="alert alert-danger">Error rendering chart</div>';
            }
            
            if (accountQuotaChart) {
                accountQuotaChart.innerHTML = '<div class="alert alert-danger">Error rendering chart</div>';
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
            
            // Display quota breakdown charts if quota data is available
            if (accountData.has_quota) {
                console.log("[LOG] Quota data available for account. Showing quota breakdown...");
                document.getElementById('quotaBreakdownSection').style.display = 'block';
                quotaChartService.createAccountQuotaBreakdownChart(accountName, accountData.quota);
                console.log("[LOG] Quota breakdown charts created.");
            } else {
                console.log("[LOG] No quota data available for account. Hiding quota breakdown section.");
                document.getElementById('quotaBreakdownSection').style.display = 'none';
            }

            console.log(`[LOG] Exiting app.showAccountDetails (success)`); // Added Log

        } catch (error) {
            console.error("[LOG] Error in app.showAccountDetails:", error); // Added Log
            uiService.showAccountDetailsError(accountName, error);
            console.log(`[LOG] Exiting app.showAccountDetails (with error)`); // Added Log
        }
    },

    /**
     * Show details for a specific person
     * @param {string} personName - Person name
     */
    showPersonDetails: function(personName) {
        console.log(`[LOG] Entering app.showPersonDetails for person: ${personName}`);
        if (config.debug) {
            console.log(`[LOG] Loading details for person: ${personName}`);
        }

        // Show loading state
        console.log("[LOG] Calling uiService.showPersonDetailsLoading...");
        uiService.showPersonDetailsLoading(personName);
        console.log("[LOG] uiService.showPersonDetailsLoading finished.");

        try {
            // Get person details
            console.log("[LOG] Calling dataService.getPersonDetails...");
            const personData = dataService.getPersonDetails(personName);
            console.log(`[LOG] dataService.getPersonDetails finished for ${personName}. Total accounts: ${personData.accounts.length}`);

            // Display person details
            console.log("[LOG] Calling uiService.displayPersonDetails...");
            uiService.displayPersonDetails(personData);
            console.log("[LOG] uiService.displayPersonDetails finished.");

            console.log(`[LOG] Exiting app.showPersonDetails (success)`);

        } catch (error) {
            console.error("[LOG] Error in app.showPersonDetails:", error);
            uiService.showPersonDetailsError(personName, error);
            console.log(`[LOG] Exiting app.showPersonDetails (with error)`);
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    console.log("[LOG] DOMContentLoaded event fired."); // Added Log
    app.init();
});
