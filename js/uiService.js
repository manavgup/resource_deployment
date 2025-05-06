/**
 * UI service for the Account Deployment Dashboard
 * Handles all user interface interactions and updates
 */
const uiService = {
    /**
     * Initialize UI components
     */
    init: function() {
        console.log("[LOG] Entering uiService.init"); // Added Log
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

        this.logDebug("UI service initialized"); // Existing debug log

        console.log("[LOG] Exiting uiService.init"); // Added Log
    },

    /**
     * Handle file selection with explicit dashboard visibility
     * @param {File} file - Selected Excel file
     */
    handleFileSelected: function(file) {
        console.log(`[LOG] Entering uiService.handleFileSelected: ${file.name}`); // Added Log

        const uploadStatus = document.getElementById('uploadStatus');

        // Check if uploadStatus element exists before trying to use it
        if (!uploadStatus) {
            console.log("[LOG] Upload status element not found. Continuing with file processing..."); // Added Log
            // Continue with file processing even if status element is missing
            this.loadFileWithoutStatus(file);
            console.log(`[LOG] Exiting uiService.handleFileSelected (uploadStatus not found)`); // Added Log
            return;
        }

        // Check if it's an Excel file
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            uploadStatus.innerHTML = '<div class="alert alert-danger">Please select a valid Excel file (.xlsx or .xls)</div>';
            uploadStatus.style.display = 'block';
             console.log(`[LOG] Exiting uiService.handleFileSelected (invalid file type)`); // Added Log
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
        console.log("[LOG] Calling uiService.loadFileWithoutStatus..."); // Added Log
        this.loadFileWithoutStatus(file);
        console.log(`[LOG] Exiting uiService.handleFileSelected (calling loadFileWithoutStatus)`); // Added Log
    },

    /**
     * Load file without depending on uploadStatus element
     * @param {File} file - Excel file to load
     */
    loadFileWithoutStatus: function(file) {
        console.log(`[LOG] Entering uiService.loadFileWithoutStatus: ${file.name}`); // Added Log

        console.log("[LOG] Calling app.loadFile..."); // Added Log
        app.loadFile(file)
            .then(data => {
                console.log(`[LOG] app.loadFile promise resolved in uiService.loadFileWithoutStatus.`); // Added Log
                console.log(`[UIService] File processed successfully: ${file.name}, records:`, data ? data.length : "unknown"); // Existing log

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
                    console.log("[LOG] Revealing dashboard container"); // Added Log
                    dashboardContainer.style.display = 'block';
                } else {
                    console.error("[LOG] Dashboard container element not found!"); // Added Log
                }
                console.log(`[LOG] Exiting uiService.loadFileWithoutStatus (success)`); // Added Log

            })
            .catch(error => {
                console.error('[LOG] Error processing file in uiService:', error); // Added Log

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
                console.log(`[LOG] Exiting uiService.loadFileWithoutStatus (with error)`); // Added Log
            });
    },

    /**
     * Update filter dropdowns with options
     * @param {Object} filters - Filter options
     */
    populateFilters: function(filters) {
        console.log("[LOG] Entering uiService.populateFilters with filters:", filters); // Added Log
        // Brand filter
        const brandSelect = document.getElementById('brandFilter');
        this.clearOptions(brandSelect);
        this.addOption(brandSelect, '', 'All Brands');

        filters.brands.forEach(brand => {
            this.addOption(brandSelect, brand, brand);
        });
        console.log(`[LOG] Populated ${filters.brands.length} brand options.`); // Added Log


        // Account filter
        const accountSelect = document.getElementById('accountFilter');
        this.clearOptions(accountSelect);
        this.addOption(accountSelect, '', 'All Accounts');

        filters.accounts.forEach(account => {
            this.addOption(accountSelect, account, account);
        });
        console.log(`[LOG] Populated ${filters.accounts.length} account options.`); // Added Log


        // SLM filter
        const slmSelect = document.getElementById('slmFilter');
        this.clearOptions(slmSelect);
        this.addOption(slmSelect, '', 'All SLMs');

        filters.slms.forEach(slm => {
            if (slm && slm.trim() !== "") {
                this.addOption(slmSelect, slm, slm);
            }
        });
        console.log(`[LOG] Populated ${filters.slms.length} SLM options.`); // Added Log


        // FLM filter
        const flmSelect = document.getElementById('flmFilter');
        this.clearOptions(flmSelect);
        this.addOption(flmSelect, '', 'All FLMs');

        filters.flms.forEach(flm => {
            if (flm && flm.trim() !== "") {
                this.addOption(flmSelect, flm, flm);
            }
        });
         console.log(`[LOG] Populated ${filters.flms.length} FLM options.`); // Added Log


        console.log("[LOG] Exiting uiService.populateFilters"); // Added Log
    },

    /**
     * Clear all options from a select element
     * @param {HTMLElement} selectElement - Select element to clear
     */
    clearOptions: function(selectElement) {
        // console.log(`[LOG] Clearing options for select element: ${selectElement ? selectElement.id : 'unknown'}`); // Too verbose
        if (!selectElement) return;

        while (selectElement.options.length > 0) {
            selectElement.remove(0);
        }
        // console.log("[LOG] Options cleared."); // Too verbose
    },

    /**
     * Add an option to a select element
     * @param {HTMLElement} selectElement - Select element
     * @param {string} value - Option value
     * @param {string} text - Option text
     */
    addOption: function(selectElement, value, text) {
        // console.log(`[LOG] Adding option "${text}" with value "${value}" to select element: ${selectElement ? selectElement.id : 'unknown'}`); // Too verbose
        if (!selectElement) return;

        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        selectElement.appendChild(option);
         // console.log("Option added."); // Too verbose
    },

    /**
     * Get current filter values from the UI
     * @returns {Object} Filter values
     */
    getFilterValues: function() {
        console.log("[LOG] Entering uiService.getFilterValues"); // Added Log
        const filters = {
            brand: document.getElementById('brandFilter')?.value || '',
            account: document.getElementById('accountFilter')?.value || '',
            slm: document.getElementById('slmFilter')?.value || '',
            flm: document.getElementById('flmFilter')?.value || '',
            person: document.getElementById('personFilter')?.value || ''
        };
        console.log("[LOG] Exiting uiService.getFilterValues. Returning filters:", filters); // Added Log
        return filters;
    },

    /**
     * Update results table with filtered data
     * @param {Array} data - Filtered data
     * @param {string} viewMode - 'raw' or 'fte'
     */
    updateResultsTable: function(data, viewMode) {
        console.log(`[LOG] Entering uiService.updateResultsTable with ${data.length} records, viewMode: ${viewMode}`); // Added Log
        const tableBody = document.getElementById('resultsTable');
        const resultCount = document.getElementById('resultCount');
        const allocationHeader = document.getElementById('allocationHeader');

        if (!tableBody || !resultCount || !allocationHeader) {
             console.warn("[LOG] updateResultsTable: Required DOM elements not found."); // Added Warning
             return;
        }

        // Always show allocation header since we're always in FTE mode
        allocationHeader.style.display = '';
        console.log("[LOG] Allocation header always visible now"); // Added Log

        // Update result count badge
        tableBody.innerHTML = ''; // Clear existing rows
        resultCount.textContent = `${data.length} results`;
         console.log(`[LOG] Updated result count to ${data.length}`); // Added Log


         if (data.length === 0) {
             console.log("[LOG] No results to display in table."); // Added Log
             const row = document.createElement('tr');
             // Adjusted colspan for the new Specialty column (7 + 1 = 8 in FTE mode)
             const colSpan = viewMode === 'fte' ? 8 : 7;
             row.innerHTML = `<td colspan="${colSpan}" class="text-center">No results found</td>`;
             tableBody.appendChild(row);
              console.log("[LOG] Added 'No results' row to table."); // Added Log
            console.log("[LOG] Exiting uiService.updateResultsTable (no results)"); // Added Log
            return;
        }

        // Add the first N items (for performance)
        const displayLimit = config.charts.displayLimit || 100;
        const displayData = data.slice(0, displayLimit);
        console.log(`[LOG] Displaying ${displayData.length} out of ${data.length} results (limit: ${displayLimit})`); // Added Log


         displayData.forEach((item, index) => {
             // console.log(`[LOG] Adding row ${index + 1}/${displayData.length} for person: ${item.person}`); // Too verbose per row
             const row = document.createElement('tr');
             // Use the helper function for common cells, add Account and Actions cells
             let html = `<td>${item.account || '-'}</td>`; // Add Account cell first
             html += this._createPersonnelTableRowHTML(item, viewMode); // Add common cells (Brand, SLM, FLM, Person, Specialty, Allocation)

             // Add Actions cell
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
             console.log("[LOG] Adding display limit note to table."); // Added Log
             const row = document.createElement('tr');
             // Adjusted colspan for the new Specialty column (7 + 1 = 8 in FTE mode)
             const colSpan = viewMode === 'fte' ? 8 : 7;
             row.innerHTML = `<td colspan="${colSpan}" class="text-center text-muted">
                 Showing ${displayLimit} of ${data.length} results. Apply more filters to narrow down the results.
             </td>`;
            tableBody.appendChild(row);
             console.log("[LOG] Display limit note added."); // Added Log
        }

        console.log("[LOG] Exiting uiService.updateResultsTable (data displayed)"); // Added Log
    },

    /**
     * Update view elements based on the current view mode
     * @param {string} viewMode - 'raw' or 'fte'
     */
    updateViewElements: function(viewMode) {
        console.log(`[LOG] Entering uiService.updateViewElements with viewMode: ${viewMode}`); // Added Log
        // Update radio buttons
        const rawRadio = document.getElementById('rawCountRadio');
        const fteRadio = document.getElementById('fteCountRadio');

        if (rawRadio && fteRadio) {
            rawRadio.checked = viewMode === 'raw';
            fteRadio.checked = viewMode === 'fte';
             console.log(`[LOG] Radio buttons updated. Raw: ${rawRadio.checked}, FTE: ${fteRadio.checked}`); // Added Log
        } else {
             console.warn("[LOG] Radio button elements not found."); // Added Warning
        }


        // Always show allocation column headers
        const allocationHeader = document.getElementById('allocationHeader');
        const accountDetailAllocationHeader = document.getElementById('accountDetailAllocationHeader');

        if (allocationHeader) {
            allocationHeader.style.display = '';
            console.log("[LOG] Main allocation header always visible now"); // Added Log
        } else {
            console.warn("[LOG] Main allocation header element not found."); // Added Warning
        }

        if (accountDetailAllocationHeader) {
            accountDetailAllocationHeader.style.display = '';
            console.log("[LOG] Detail allocation header always visible now"); // Added Log
        } else {
            console.warn("[LOG] Detail allocation header element not found."); // Added Warning
        }


        // Update chart titles
        console.log("[LOG] Calling chartService.updateChartTitles..."); // Added Log
        chartService.updateChartTitles(viewMode);
        console.log("[LOG] chartService.updateChartTitles finished."); // Added Log

        console.log("[LOG] Exiting uiService.updateViewElements"); // Added Log
    },

    /**
     * Display account details
     * @param {Object} accountData - Account detail data
     * @param {string} viewMode - 'raw' or 'fte'
     */
    displayAccountDetails: function(accountData, viewMode) {
        console.log(`[LOG] Entering uiService.displayAccountDetails for account: ${accountData.account}, viewMode: ${viewMode}`); // Added Log
        console.log("[LOG] Account data for details:", accountData); // Added Log

        // Show the account detail panel
        const accountDetailPanel = document.getElementById('accountDetailPanel');
        const accountDetailTitle = document.getElementById('accountDetailTitle');
        const accountPeopleTable = document.getElementById('accountPeopleTable');

        if (!accountDetailPanel || !accountDetailTitle || !accountPeopleTable) {
             console.warn("[LOG] displayAccountDetails: Required DOM elements for details panel not found."); // Added Warning
             return;
        }

        accountDetailPanel.style.display = 'block';
        console.log("[LOG] Account detail panel set to display: block."); // Added Log


        // Always show FTE information in the account title
        accountDetailTitle.textContent =
            `${accountData.account} (${accountData.total_people} people, ${accountData.total_fte.toFixed(2)} FTE)`;
        console.log(`[LOG] Account detail title updated: "${accountDetailTitle.textContent}"`); // Added Log


        // Create brand breakdown pie chart
        console.log("[LOG] Calling chartService.createAccountTechChart for details panel..."); // Added Log
        chartService.createAccountTechChart(accountData.brand_breakdown, viewMode);
        console.log("[LOG] chartService.createAccountTechChart finished."); // Added Log


        // Populate people table
        console.log(`[LOG] Populating people table for ${accountData.account}...`); // Added Log
        accountPeopleTable.innerHTML = ''; // Clear existing rows

         if (!accountData.people || accountData.people.length === 0) {
              console.log("[LOG] No people data for this account."); // Added Log
              const row = document.createElement('tr');
              // Adjusted colspan for new Specialty column (5 + 1 = 6 in FTE mode)
              const colSpan = viewMode === 'fte' ? 6 : 5;
              row.innerHTML = `<td colspan="${colSpan}" class="text-center">No personnel listed for this account.</td>`;
              accountPeopleTable.appendChild(row);
              console.log("[LOG] Added 'No personnel' row to detail table."); // Added Log

        } else {
            accountData.people.forEach((person, index) => {
                 // console.log(`[LOG] Adding person ${index + 1}/${accountData.people.length}: ${person.person}`); // Too verbose per person
                const row = document.createElement('tr');
                // Use the helper function for common cells
                // Note: The 'person' object here comes from getAccountDetails which includes 'allocation'
                let html = this._createPersonnelTableRowHTML(person, viewMode);

                row.innerHTML = html;
                accountPeopleTable.appendChild(row);
            });
             console.log(`[LOG] Finished populating people table with ${accountData.people.length} entries.`); // Added Log
        }


        console.log("[LOG] Exiting uiService.displayAccountDetails"); // Added Log
    },

    /**
     * Show loading state for charts
     */
    showChartLoading: function() {
        console.log("[LOG] Entering uiService.showChartLoading"); // Added Log
        const accountsChart = document.getElementById('accountsChart');
        const technologiesChart = document.getElementById('technologiesChart');

        if (accountsChart) {
            accountsChart.innerHTML = '<div class="loading">Loading chart data...</div>';
             console.log("[LOG] Accounts chart loading state set."); // Added Log
        } else {
             console.warn("[LOG] Accounts chart element not found for loading state."); // Added Warning
        }


        if (technologiesChart) {
            technologiesChart.innerHTML = '<div class="loading">Loading chart data...</div>';
             console.log("[LOG] Technologies chart loading state set."); // Added Log
        } else {
             console.warn("[LOG] Technologies chart element not found for loading state."); // Added Warning
        }

         console.log("[LOG] Exiting uiService.showChartLoading"); // Added Log
    },

    /**
     * Show loading state for account details
     * @param {string} accountName - Account name
     */
    showAccountDetailsLoading: function(accountName) {
        console.log(`[LOG] Entering uiService.showAccountDetailsLoading for account: ${accountName}`); // Added Log
        const accountDetailPanel = document.getElementById('accountDetailPanel');
        const accountDetailTitle = document.getElementById('accountDetailTitle');
        const accountPeopleTable = document.getElementById('accountPeopleTable');

        if (!accountDetailPanel || !accountDetailTitle || !accountPeopleTable) {
             console.warn("[LOG] showAccountDetailsLoading: Required DOM elements for details panel not found."); // Added Warning
             return;
        }


        accountDetailPanel.style.display = 'block';
        accountDetailTitle.textContent = `Loading ${accountName} details...`;
        accountPeopleTable.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

        console.log(`[LOG] Account details loading state set for ${accountName}`); // Added Log
        console.log("[LOG] Exiting uiService.showAccountDetailsLoading"); // Added Log
    },

    /**
     * Show error message for account details
     * @param {string} accountName - Account name
     * @param {Error} error - Error object
     */
    showAccountDetailsError: function(accountName, error) {
        console.log(`[LOG] Entering uiService.showAccountDetailsError for account: ${accountName}`); // Added Log
        const accountDetailTitle = document.getElementById('accountDetailTitle');
        const accountPeopleTable = document.getElementById('accountPeopleTable');

         if (!accountDetailTitle || !accountPeopleTable) {
             console.warn("[LOG] showAccountDetailsError: Required DOM elements for details panel not found."); // Added Warning
             return;
         }


        accountDetailTitle.textContent = `Error loading ${accountName} details`;
        accountPeopleTable.innerHTML =
            '<tr><td colspan="5" class="text-center text-danger">Error loading data. Please try again.</td></tr>';

        this.logDebug(`Error loading account details: ${error.message}`); // Existing debug log

        console.log(`[LOG] Account details error state set for ${accountName}`); // Added Log
        console.log("[LOG] Exiting uiService.showAccountDetailsError"); // Added Log
    },

    /**
     * Log debug information if debug mode is enabled
     * @param {string} message - Debug message
     */
    logDebug: function(message) {
        if (config.debug) {
            console.log(`[UIService Debug] ${message}`); // Modified prefix

            // If debug panel exists, log there too
             // Assuming this exists in excel-viewer.html, not index.html
             const debugOutput = document.getElementById('debugOutput');
             if (debugOutput) {
                const timestamp = new Date().toLocaleTimeString();
                debugOutput.innerHTML += `<div>[${timestamp}] ${message}</div>`;

                // Auto-scroll to bottom
                debugOutput.scrollTop = debugOutput.scrollHeight;
            }
         }
     },

    /**
     * (Private Helper) Creates the HTML for the common cells of a personnel table row.
     * @param {Object} personData - The data object for a single person.
     * @param {string} viewMode - The current view mode ('fte').
     * @returns {string} HTML string for the table cells (<td> elements).
     */
    _createPersonnelTableRowHTML: function(personData, viewMode) {
        let cellsHTML = `
            <td>${personData.brand || '-'}</td>
            <td>${personData.slm || '-'}</td>
            <td>${personData.flm || '-'}</td>
            <td>${personData.person || '-'}</td>
            <td>${personData.role || '-'}</td> <!-- Specialty/Role -->
        `;

        // Always add allocation column (we're always in FTE mode)
        if (viewMode === 'fte') {
            // Use allocation from personData if available (from getAccountDetails), otherwise calculate it
            const allocation = personData.allocation !== undefined
                                ? personData.allocation
                                : dataService.getAllocationForPerson(personData.person);
            cellsHTML += `<td>${allocation.toFixed(2)}</td>`;
        } else {
             cellsHTML += `<td>-</td>`; // Placeholder if not FTE mode (though currently always FTE)
        }
         return cellsHTML;
     },
 
     /**
      * Shows the main dashboard container.
      */
     showDashboardContainer: function() {
         const dashboardContainer = document.getElementById('dashboardContainer');
         if (dashboardContainer) {
             dashboardContainer.style.display = 'block';
             console.log("[LOG] Dashboard container shown.");
         } else {
             console.error("[LOG] Dashboard container element not found!");
         }
     },
 
     /**
      * Hides the main dashboard container.
      */
     hideDashboardContainer: function() {
         const dashboardContainer = document.getElementById('dashboardContainer');
         if (dashboardContainer) {
             dashboardContainer.style.display = 'none';
             console.log("[LOG] Dashboard container hidden.");
         } else {
             console.error("[LOG] Dashboard container element not found!");
         }
     }
 };
