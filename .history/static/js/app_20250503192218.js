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
        
        // Load filters and data
        this.loadFilters();
        this.loadData();
    },
    
    /**
     * Load filter options
     */
    loadFilters: function() {
        dataService.loadFilterOptions()
            .then(response => {
                uiService.populateFilters(response.data);
            })
            .catch(error => {
                console.error('Error loading filters:', error);
                alert('Error loading filters. Please check the console for details.');
            });
    },
    
    /**
     * Load data and create charts
     */
    loadData: function() {
        uiService.showChartLoading();
        
        dataService.loadAllData()
            .then(() => {
                this.refreshCharts();
                this.applyFilters(); // Load initial table data
            })
            .catch(error => {
                console.error('Error loading data:', error);
                alert('Error loading data. Please check the console for details.');
            });
    },
    
    /**
     * Toggle between raw count and FTE views
     */
    toggleCountType: function() {
        const rawRadio = document.getElementById('rawCountRadio');
        const fteRadio = document.getElementById('fteCountRadio');
        
        // Check which radio button is selected
        if (rawRadio.checked) {
            this.currentViewMode = 'raw';
        } else if (fteRadio.checked) {
            this.currentViewMode = 'fte';
        }
        
        if (config.debug) {
            console.log(`Switched to ${this.currentViewMode} view mode`);
        }
        
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
        const { accountData, techData } = dataService.getDataForViewMode(this.currentViewMode);
        
        if (config.debug) {
            console.log(`Refreshing charts for ${this.currentViewMode} view mode`);
        }
        
        // Create account chart
        chartService.createAccountChart(accountData, this.currentViewMode);
        
        // Create technology breakdown chart
        chartService.createTechnologyChart(techData, this.currentViewMode);
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