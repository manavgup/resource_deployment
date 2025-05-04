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
            console.log("Initializing Account Deployment Dashboard");
        }
        
        // Initialize UI
        uiService.init();
        
        // Initialize dashboard container visibility
        const dashboardContainer = document.getElementById('dashboardContainer');
        if (dashboardContainer) {
            // Initially hidden
            dashboardContainer.style.display = 'none';
        }
    },
    
    /**
     * Load Excel file
     * @param {File} file - Excel file to load
     * @returns {Promise} Promise resolving when file is loaded
     */
    loadFile: function(file) {
        console.log(`[App] Loading file: ${file.name}`);
        
        // Make sure we return the Promise with data
        return dataService.loadExcelFile(file)
            .then(data => {
                console.log(`[App] Excel file processed, populating UI with ${data.length} records`);
                
                // Populate filters
                uiService.populateFilters(dataService.filterOptions);
                
                // Refresh charts
                console.log("[App] Refreshing charts...");
                this.refreshCharts();
                
                // Apply initial filters to show all data
                console.log("[App] Applying initial filters...");
                this.applyFilters();
                
                // Return the data for further promise chaining
                return data;
            })
            .catch(error => {
                console.error("[App] Error in loadFile:", error);
                throw error; // Propagate the error
            });
    },
    
    /**
     * Toggle between raw count and FTE views
     */
    toggleCountType: function() {
        const rawRadio = document.getElementById('rawCountRadio');
        const fteRadio = document.getElementById('fteCountRadio');
        
        // Check which radio button is selected
        if (rawRadio && rawRadio.checked) {
            this.currentViewMode = 'raw';
        } else if (fteRadio && fteRadio.checked) {
            this.currentViewMode = 'fte';
        }
        
        console.log(`Switched to ${this.currentViewMode} view mode`);
        
        // Update UI elements
        uiService.updateViewElements(this.currentViewMode);
        
        // Refresh charts and table
        this.refreshCharts();
        this.applyFilters();
    },
    
    /**
     * Apply filters and update results table
     */
    applyFilters: function() {
        const filters = uiService.getFilterValues();
        
        if (config.debug) {
            console.log("Applying filters:", filters);
        }
        
        // Filter data
        const filteredData = dataService.filterData(filters);
        
        // Update results table
        uiService.updateResultsTable(filteredData, this.currentViewMode);
    },
    
    /**
     * Refresh charts based on current view mode
     */
    refreshCharts: function() {
        try {
            const { accountData, brandData } = dataService.getDataForViewMode(this.currentViewMode);
            
            if (config.debug) {
                console.log(`Refreshing charts for ${this.currentViewMode} view mode`);
            }
            
            // Create account chart
            chartService.createAccountChart(accountData, this.currentViewMode);
            
            // Create technology breakdown chart
            chartService.createTechnologyChart(brandData, this.currentViewMode);
        } catch (error) {
            console.error("Error refreshing charts:", error);
            // Display error message in charts if possible
            const accountsChart = document.getElementById('accountsChart');
            const technologiesChart = document.getElementById('technologiesChart');
            
            if (accountsChart) {
                accountsChart.innerHTML = '<div class="alert alert-danger">Error rendering chart</div>';
            }
            
            if (technologiesChart) {
                technologiesChart.innerHTML = '<div class="alert alert-danger">Error rendering chart</div>';
            }
        }
    },
    
    /**
     * Show details for a specific account
     * @param {string} accountName - Account name
     */
    showAccountDetails: function(accountName) {
        if (config.debug) {
            console.log(`Loading details for account: ${accountName}`);
        }
        
        // Show loading state
        uiService.showAccountDetailsLoading(accountName);
        
        try {
            // Get account details
            const accountData = dataService.getAccountDetails(accountName, this.currentViewMode);
            
            // Display account details
            uiService.displayAccountDetails(accountData, this.currentViewMode);
        } catch (error) {
            uiService.showAccountDetailsError(accountName, error);
        }
    }
};

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    app.init();
});