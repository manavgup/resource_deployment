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
    },
    
    /**
     * Load Excel file
     * @param {File} file - Excel file to load
     * @returns {Promise} Promise resolving when file is loaded
     */
    loadFile: function(file) {
        return dataService.loadExcelFile(file)
            .then(() => {
                // Populate filters
                uiService.populateFilters(dataService.filterOptions);
                
                // Refresh charts
                this.refreshCharts();
                
                // Apply initial filters to show all data
                this.applyFilters();
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
        const { accountData, brandData } = dataService.getDataForViewMode(this.currentViewMode);
        
        if (config.debug) {
            console.log(`Refreshing charts for ${this.currentViewMode} view mode`);
        }
        
        // Create account chart
        chartService.createAccountChart(accountData, this.currentViewMode);
        
        // Create brand breakdown chart
        chartService.createTechnologyChart(brandData, this.currentViewMode);
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