/**
 * UI service for the Account Deployment Dashboard
 * Handles all user interface interactions and updates
 */
const uiService = {
    /**
     * Initialize UI components
     */
    init: function() {
        // Add event listener for Enter key on the person filter
        document.getElementById('personFilter').addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                app.applyFilters();
            }
        });
    },
    
    /**
     * Update filter dropdowns with options
     * @param {Object} filters - Filter options from the API
     */
    populateFilters: function(filters) {
        // Account filter
        const accountSelect = document.getElementById('accountFilter');
        this.clearOptions(accountSelect);
        this.addOption(accountSelect, '', 'All Accounts');
        
        filters.accounts.forEach(account => {
            this.addOption(accountSelect, account, account);
        });
        
        // Technology filter
        const techSelect = document.getElementById('techFilter');
        this.clearOptions(techSelect);
        this.addOption(techSelect, '', 'All Technologies');
        
        filters.technologies.forEach(tech => {
            this.addOption(techSelect, tech, tech);
        });
        
        // Role filter
        const roleSelect = document.getElementById('roleFilter');
        this.clearOptions(roleSelect);
        this.addOption(roleSelect, '', 'All Roles');
        
        filters.roles.forEach(role => {
            if (role && role.trim() !== "") {
                this.addOption(roleSelect, role, role);
            }
        });
        
        // Leader filter
        const leaderSelect = document.getElementById('leaderFilter');
        this.clearOptions(leaderSelect);
        this.addOption(leaderSelect, '', 'All Leaders');
        
        filters.leaders.forEach(leader => {
            if (leader && leader.trim() !== "") {
                this.addOption(leaderSelect, leader, leader);
            }
        });
    },
    
    /**
     * Clear all options from a select element
     * @param {HTMLElement} selectElement - Select element to clear
     */
    clearOptions: function(selectElement) {
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
            account: document.getElementById('accountFilter').value,
            technology: document.getElementById('techFilter').value,
            role: document.getElementById('roleFilter').value,
            leader: document.getElementById('leaderFilter').value,
            person: document.getElementById('personFilter').value
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
        
        // Update allocation header visibility
        allocationHeader.style.display = viewMode === 'fte' ? '' : 'none';
        
        // Update result count badge
        tableBody.innerHTML = '';
        resultCount.textContent = `${data.length} results`;
        
        if (data.length === 0) {
            const row = document.createElement('tr');
            const colSpan = viewMode === 'fte' ? 6 : 5;
            row.innerHTML = `<td colspan="${colSpan}" class="text-center">No results found</td>`;
            tableBody.appendChild(row);
            return;
        }
        
        // Add the first N items (for performance)
        const displayLimit = config.charts.displayLimit;
        const displayData = data.slice(0, displayLimit);
        
        displayData.forEach(item => {
            const row = document.createElement('tr');
            let html = `
                <td>${item.account}</td>
                <td>${item.technology_area}</td>
                <td>${item.role || ''}</td>
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
            const colSpan = viewMode === 'fte' ? 6 : 5;
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
        document.getElementById('rawCountRadio').checked = viewMode === 'raw';
        document.getElementById('fteCountRadio').checked = viewMode === 'fte';
        
        // Update allocation column header visibility
        document.getElementById('allocationHeader').style.display = viewMode === 'fte' ? '' : 'none';
        document.getElementById('accountDetailAllocationHeader').style.display = viewMode === 'fte' ? '' : 'none';
        
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
        document.getElementById('accountDetailPanel').style.display = 'block';
        
        // Update panel title
        if (viewMode === 'raw') {
            document.getElementById('accountDetailTitle').textContent = 
                `${accountData.account} (${accountData.total_people} people)`;
        } else {
            document.getElementById('accountDetailTitle').textContent = 
                `${accountData.account} (${accountData.total_people} people, ${accountData.total_fte.toFixed(2)} FTE)`;
        }
        
        // Create technology breakdown pie chart
        chartService.createAccountTechChart(accountData.tech_breakdown, viewMode);
        
        // Populate people table
        const peopleTable = document.getElementById('accountPeopleTable');
        peopleTable.innerHTML = '';
        
        accountData.people.forEach(person => {
            const row = document.createElement('tr');
            let html = `
                <td>${person.person}</td>
                <td>${person.role || ''}</td>
                <td>${person.technology_area}</td>
            `;
            
            // Add allocation column if in FTE mode
            if (viewMode === 'fte' && person.allocation) {
                html += `<td>${person.allocation.toFixed(2)}</td>`;
            }
            
            row.innerHTML = html;
            peopleTable.appendChild(row);
        });
    },
    
    /**
     * Show loading state for charts
     */
    showChartLoading: function() {
        document.getElementById('accountsChart').innerHTML = 
            '<div class="loading">Loading chart data...</div>';
        document.getElementById('technologiesChart').innerHTML = 
            '<div class="loading">Loading chart data...</div>';
    },
    
    /**
     * Show loading state for account details
     * @param {string} accountName - Account name
     */
    showAccountDetailsLoading: function(accountName) {
        document.getElementById('accountDetailPanel').style.display = 'block';
        document.getElementById('accountDetailTitle').textContent = `Loading ${accountName} details...`;
        document.getElementById('accountPeopleTable').innerHTML = 
            '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    },
    
    /**
     * Show error message for account details
     * @param {string} accountName - Account name
     * @param {Error} error - Error object
     */
    showAccountDetailsError: function(accountName, error) {
        document.getElementById('accountDetailTitle').textContent = `Error loading ${accountName} details`;
        document.getElementById('accountPeopleTable').innerHTML = 
            '<tr><td colspan="4" class="text-center text-danger">Error loading data. Please try again.</td></tr>';
            
        if (config.debug) {
            console.error('Error loading account details:', error);
        }
    }
};