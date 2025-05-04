/**
 * UI service for the Account Deployment Dashboard
 * Handles all user interface interactions and updates
 */
const uiService = {
    /**
     * Initialize UI components
     */
    init: function() {
        // Add event listener for file input
        const fileInput = document.getElementById('excelFile');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelected(e.target.files[0]);
                }
            });
        }
        
        // Add event listener for upload button
        const uploadButton = document.getElementById('uploadButton');
        if (uploadButton) {
            uploadButton.addEventListener('click', () => {
                const fileInput = document.getElementById('excelFile');
                if (fileInput.files.length > 0) {
                    this.handleFileSelected(fileInput.files[0]);
                } else {
                    alert('Please select a file first.');
                }
            });
        }
        
        // Add event listener for Enter key on the person filter
        const personFilter = document.getElementById('personFilter');
        if (personFilter) {
            personFilter.addEventListener('keyup', function(event) {
                if (event.key === 'Enter') {
                    app.applyFilters();
                }
            });
        }
        
        this.logDebug("UI service initialized");
    },
    
    /**
     * Handle file selection with explicit dashboard visibility
     * @param {File} file - Selected Excel file
     */
    handleFileSelected: function(file) {
        console.log(`[UIService] File selected: ${file.name}`);
        
        const uploadStatus = document.getElementById('uploadStatus');
        
        // Check if uploadStatus element exists before trying to use it
        if (!uploadStatus) {
            console.log("[UIService] Upload status element not found. Continuing with file processing...");
            // Continue with file processing even if status element is missing
            this.loadFileWithoutStatus(file);
            return;
        }
        
        // Check if it's an Excel file
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            uploadStatus.innerHTML = '<div class="alert alert-danger">Please select a valid Excel file (.xlsx or .xls)</div>';
            uploadStatus.style.display = 'block';
            return;
        }
        
        // Show loading status
        uploadStatus.innerHTML = '<div class="alert alert-info">Loading file...</div>';
        uploadStatus.style.display = 'block';
        
        // Show loading indicator if it exists
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'inline-block';
        }
        
        // Load the file
        this.loadFileWithoutStatus(file);
    },

    /**
     * Load file without depending on uploadStatus element
     * @param {File} file - Excel file to load
     */
    loadFileWithoutStatus: function(file) {
        console.log(`[UIService] Processing file: ${file.name}`);
        
        app.loadFile(file)
            .then(data => {
                console.log(`[UIService] File processed successfully: ${file.name}, records:`, data ? data.length : "unknown");
                
                // Update uploadStatus if it exists
                const uploadStatus = document.getElementById('uploadStatus');
                if (uploadStatus) {
                    uploadStatus.innerHTML = `<div class="alert alert-success">
                        File loaded successfully: ${file.name}
                    </div>`;
                    uploadStatus.style.display = 'block';
                }
                
                // Hide loading indicator if it exists
                const loadingIndicator = document.getElementById('loadingIndicator');
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
                
                // CRITICAL: Explicitly show the dashboard container
                const dashboardContainer = document.getElementById('dashboardContainer');
                if (dashboardContainer) {
                    console.log("[UIService] Revealing dashboard container");
                    dashboardContainer.style.display = 'block';
                } else {
                    console.error("[UIService] Dashboard container element not found!");
                }
            })
            .catch(error => {
                console.error('[UIService] Error processing file:', error);
                
                // Update uploadStatus if it exists
                const uploadStatus = document.getElementById('uploadStatus');
                if (uploadStatus) {
                    uploadStatus.innerHTML = `<div class="alert alert-danger">
                        Error loading file: ${error.message}
                    </div>`;
                    uploadStatus.style.display = 'block';
                }
                
                // Hide loading indicator if it exists
                const loadingIndicator = document.getElementById('loadingIndicator');
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
            });
    },
    
    /**
     * Update filter dropdowns with options
     * @param {Object} filters - Filter options
     */
    populateFilters: function(filters) {
        // Brand filter
        const brandSelect = document.getElementById('brandFilter');
        this.clearOptions(brandSelect);
        this.addOption(brandSelect, '', 'All Brands');
        
        filters.brands.forEach(brand => {
            this.addOption(brandSelect, brand, brand);
        });
        
        // Account filter
        const accountSelect = document.getElementById('accountFilter');
        this.clearOptions(accountSelect);
        this.addOption(accountSelect, '', 'All Accounts');
        
        filters.accounts.forEach(account => {
            this.addOption(accountSelect, account, account);
        });
        
        // SLM filter
        const slmSelect = document.getElementById('slmFilter');
        this.clearOptions(slmSelect);
        this.addOption(slmSelect, '', 'All SLMs');
        
        filters.slms.forEach(slm => {
            if (slm && slm.trim() !== "") {
                this.addOption(slmSelect, slm, slm);
            }
        });
        
        // FLM filter
        const flmSelect = document.getElementById('flmFilter');
        this.clearOptions(flmSelect);
        this.addOption(flmSelect, '', 'All FLMs');
        
        filters.flms.forEach(flm => {
            if (flm && flm.trim() !== "") {
                this.addOption(flmSelect, flm, flm);
            }
        });
    },
    
    /**
     * Clear all options from a select element
     * @param {HTMLElement} selectElement - Select element to clear
     */
    clearOptions: function(selectElement) {
        if (!selectElement) return;
        
        while (selectElement.options.length > 0) {
            selectElement.remove(0);
        }
    },
    
    /**
     * Add an option to a select element
     * @param {HTMLElement} selectElement - Select element
     * @param {string} value - Option value
     * @param {string} text - Option text
     */
    addOption: function(selectElement, value, text) {
        if (!selectElement) return;
        
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        selectElement.appendChild(option);
    },
    
    /**
     * Get current filter values from the UI
     * @returns {Object} Filter values
     */
    getFilterValues: function() {
        return {
            brand: document.getElementById('brandFilter')?.value || '',
            account: document.getElementById('accountFilter')?.value || '',
            slm: document.getElementById('slmFilter')?.value || '',
            flm: document.getElementById('flmFilter')?.value || '',
            person: document.getElementById('personFilter')?.value || ''
        };
    },
    
    /**
     * Update results table with filtered data
     * @param {Array} data - Filtered data
     * @param {string} viewMode - 'raw' or 'fte'
     */
    updateResultsTable: function(data, viewMode) {
        const tableBody = document.getElementById('resultsTable');
        const resultCount = document.getElementById('resultCount');
        const allocationHeader = document.getElementById('allocationHeader');
        
        if (!tableBody || !resultCount || !allocationHeader) return;
        
        // Update allocation header visibility
        allocationHeader.style.display = viewMode === 'fte' ? '' : 'none';
        
        // Update result count badge
        tableBody.innerHTML = '';
        resultCount.textContent = `${data.length} results`;
        
        if (data.length === 0) {
            const row = document.createElement('tr');
            const colSpan = viewMode === 'fte' ? 7 : 6;
            row.innerHTML = `<td colspan="${colSpan}" class="text-center">No results found</td>`;
            tableBody.appendChild(row);
            return;
        }
        
        // Add the first N items (for performance)
        const displayLimit = config.charts.displayLimit || 100;
        const displayData = data.slice(0, displayLimit);
        
        displayData.forEach(item => {
            const row = document.createElement('tr');
            let html = `
                <td>${item.account}</td>
                <td>${item.brand}</td>
                <td>${item.slm || '-'}</td>
                <td>${item.flm || '-'}</td>
                <td>${item.person}</td>
            `;
            
            // Add allocation column if in FTE mode
            if (viewMode === 'fte') {
                const allocation = dataService.getAllocationForPerson(item.person);
                html += `<td>${allocation.toFixed(2)}</td>`;
            }
            
            html += `
                <td>
                    <button class="btn btn-sm btn-info" onclick="app.showAccountDetails('${item.account}')">
                        View Account
                    </button>
                </td>
            `;
            
            row.innerHTML = html;
            tableBody.appendChild(row);
        });
        
        // Add a note if we're limiting the display
        if (data.length > displayLimit) {
            const row = document.createElement('tr');
            const colSpan = viewMode === 'fte' ? 7 : 6;
            row.innerHTML = `<td colspan="${colSpan}" class="text-center text-muted">
                Showing ${displayLimit} of ${data.length} results. Apply more filters to narrow down the results.
            </td>`;
            tableBody.appendChild(row);
        }
    },
    
    /**
     * Update view elements based on the current view mode
     * @param {string} viewMode - 'raw' or 'fte'
     */
    updateViewElements: function(viewMode) {
        // Update radio buttons
        const rawRadio = document.getElementById('rawCountRadio');
        const fteRadio = document.getElementById('fteCountRadio');
        
        if (rawRadio && fteRadio) {
            rawRadio.checked = viewMode === 'raw';
            fteRadio.checked = viewMode === 'fte';
        }
        
        // Update allocation column header visibility
        const allocationHeader = document.getElementById('allocationHeader');
        const accountDetailAllocationHeader = document.getElementById('accountDetailAllocationHeader');
        
        if (allocationHeader) {
            allocationHeader.style.display = viewMode === 'fte' ? '' : 'none';
        }
        
        if (accountDetailAllocationHeader) {
            accountDetailAllocationHeader.style.display = viewMode === 'fte' ? '' : 'none';
        }
        
        // Update chart titles
        chartService.updateChartTitles(viewMode);
    },
    
    /**
     * Display account details
     * @param {Object} accountData - Account detail data
     * @param {string} viewMode - 'raw' or 'fte'
     */
    displayAccountDetails: function(accountData, viewMode) {
        // Show the account detail panel
        const accountDetailPanel = document.getElementById('accountDetailPanel');
        const accountDetailTitle = document.getElementById('accountDetailTitle');
        const accountPeopleTable = document.getElementById('accountPeopleTable');
        
        if (!accountDetailPanel || !accountDetailTitle || !accountPeopleTable) return;
        
        accountDetailPanel.style.display = 'block';
        
        // Update panel title
        if (viewMode === 'raw') {
            accountDetailTitle.textContent = 
                `${accountData.account} (${accountData.total_people} people)`;
        } else {
            accountDetailTitle.textContent = 
                `${accountData.account} (${accountData.total_people} people, ${accountData.total_fte.toFixed(2)} FTE)`;
        }
        
        // Create brand breakdown pie chart
        // FIXED: Using the correct function name
        chartService.createAccountTechChart(accountData.brand_breakdown, viewMode);
        
        // Populate people table
        accountPeopleTable.innerHTML = '';
        
        accountData.people.forEach(person => {
            const row = document.createElement('tr');
            let html = `
                <td>${person.brand}</td>
                <td>${person.slm || '-'}</td>
                <td>${person.flm || '-'}</td>
                <td>${person.person}</td>
            `;
            
            // Add allocation column if in FTE mode
            if (viewMode === 'fte' && person.allocation) {
                html += `<td>${person.allocation.toFixed(2)}</td>`;
            }
            
            row.innerHTML = html;
            accountPeopleTable.appendChild(row);
        });
    },
    
    /**
     * Show loading state for charts
     */
    showChartLoading: function() {
        const accountsChart = document.getElementById('accountsChart');
        const technologiesChart = document.getElementById('technologiesChart');
        
        if (accountsChart) {
            accountsChart.innerHTML = '<div class="loading">Loading chart data...</div>';
        }
        
        if (technologiesChart) {
            technologiesChart.innerHTML = '<div class="loading">Loading chart data...</div>';
        }
    },
    
    /**
     * Show loading state for account details
     * @param {string} accountName - Account name
     */
    showAccountDetailsLoading: function(accountName) {
        const accountDetailPanel = document.getElementById('accountDetailPanel');
        const accountDetailTitle = document.getElementById('accountDetailTitle');
        const accountPeopleTable = document.getElementById('accountPeopleTable');
        
        if (!accountDetailPanel || !accountDetailTitle || !accountPeopleTable) return;
        
        accountDetailPanel.style.display = 'block';
        accountDetailTitle.textContent = `Loading ${accountName} details...`;
        accountPeopleTable.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    },
    
    /**
     * Show error message for account details
     * @param {string} accountName - Account name
     * @param {Error} error - Error object
     */
    showAccountDetailsError: function(accountName, error) {
        const accountDetailTitle = document.getElementById('accountDetailTitle');
        const accountPeopleTable = document.getElementById('accountPeopleTable');
        
        if (!accountDetailTitle || !accountPeopleTable) return;
        
        accountDetailTitle.textContent = `Error loading ${accountName} details`;
        accountPeopleTable.innerHTML = 
            '<tr><td colspan="5" class="text-center text-danger">Error loading data. Please try again.</td></tr>';
            
        this.logDebug(`Error loading account details: ${error.message}`);
    },
    
    /**
     * Log debug information if debug mode is enabled
     * @param {string} message - Debug message
     */
    logDebug: function(message) {
        if (config.debug) {
            console.log(`[UIService] ${message}`);
            
            // If debug panel exists, log there too
            const debugOutput = document.getElementById('debugOutput');
            if (debugOutput) {
                const timestamp = new Date().toLocaleTimeString();
                debugOutput.innerHTML += `<div>[${timestamp}] ${message}</div>`;
                
                // Auto-scroll to bottom
                debugOutput.scrollTop = debugOutput.scrollHeight;
            }
        }
    }
};