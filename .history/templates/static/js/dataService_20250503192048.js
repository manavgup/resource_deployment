/**
 * Data service for the Account Deployment Dashboard
 * Handles all data loading, processing, and FTE calculations
 */
const dataService = {
    // Raw data storage
    rawData: [],
    
    // Processed data
    accountCounts: {},
    techByAccount: {},
    accountFTE: {},
    techFTEByAccount: {},
    personAllocations: {},
    
    /**
     * Load all data from the API
     * @returns {Promise} Promise resolving when data is loaded
     */
    loadAllData: function() {
        return axios.get(config.api.data)
            .then(response => {
                this.rawData = response.data;
                if (config.debug) {
                    console.log("Loaded data:", this.rawData.length, "records");
                }
                this.processData();
                return this.rawData;
            });
    },
    
    /**
     * Load filter options from the API
     * @returns {Promise} Promise resolving with filter options
     */
    loadFilterOptions: function() {
        return axios.get(config.api.filters);
    },
    
    /**
     * Process raw data to calculate counts and FTE allocations
     */
    processData: function() {
        // Reset processed data
        this.accountCounts = {};
        this.techByAccount = {};
        this.accountFTE = {};
        this.techFTEByAccount = {};
        this.personAllocations = {};
        
        // First, count how many accounts each person appears on
        const personAccounts = {};
        this.rawData.forEach(item => {
            if (!personAccounts[item.person]) {
                personAccounts[item.person] = new Set();
            }
            personAccounts[item.person].add(item.account);
        });
        
        // Store allocation values for each person
        Object.entries(personAccounts).forEach(([person, accounts]) => {
            this.personAllocations[person] = 1.0 / accounts.size;
        });
        
        if (config.debug) {
            const samplePeople = Object.keys(this.personAllocations).slice(0, 5);
            console.log("Sample allocations:");
            samplePeople.forEach(person => {
                console.log(`  ${person}: ${this.personAllocations[person].toFixed(2)} FTE (on ${personAccounts[person].size} accounts)`);
            });
        }
        
        // Now process the raw data to calculate counts and FTE
        this.rawData.forEach(item => {
            const { account, technology_area, person } = item;
            const allocation = this.personAllocations[person];
            
            // Initialize if needed for raw counts
            if (!this.accountCounts[account]) {
                this.accountCounts[account] = 0;
                this.techByAccount[account] = {};
            }
            
            // Initialize if needed for FTE
            if (!this.accountFTE[account]) {
                this.accountFTE[account] = 0;
                this.techFTEByAccount[account] = {};
            }
            
            // Raw counts
            this.accountCounts[account]++;
            if (!this.techByAccount[account][technology_area]) {
                this.techByAccount[account][technology_area] = 0;
            }
            this.techByAccount[account][technology_area]++;
            
            // FTE allocations
            this.accountFTE[account] += allocation;
            if (!this.techFTEByAccount[account][technology_area]) {
                this.techFTEByAccount[account][technology_area] = 0;
            }
            this.techFTEByAccount[account][technology_area] += allocation;
        });
        
        if (config.debug) {
            // Log the top accounts for both raw count and FTE
            const topAccounts = Object.entries(this.accountCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
                
            console.log("Top 5 accounts by raw count:");
            topAccounts.forEach(([account, count]) => {
                console.log(`  ${account}: ${count} people`);
            });
            
            console.log("Top 5 accounts by FTE:");
            topAccounts.forEach(([account]) => {
                console.log(`  ${account}: ${this.accountFTE[account].toFixed(2)} FTE`);
            });
        }
    },
    
    /**
     * Get data for the specified view mode
     * @param {string} viewMode - 'raw' or 'fte'
     * @returns {Object} Appropriate data for the view mode
     */
    getDataForViewMode: function(viewMode) {
        return {
            accountData: viewMode === 'raw' ? this.accountCounts : this.accountFTE,
            techData: viewMode === 'raw' ? this.techByAccount : this.techFTEByAccount
        };
    },
    
    /**
     * Get allocation value for a person
     * @param {string} person - Person name
     * @returns {number} Allocation value (or 1.0 if not found)
     */
    getAllocationForPerson: function(person) {
        return this.personAllocations[person] || 1.0;
    },
    
    /**
     * Filter data based on criteria
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered data array
     */
    filterData: function(filters) {
        return this.rawData.filter(item => {
            // Account filter
            if (filters.account && !item.account.includes(filters.account)) {
                return false;
            }
            
            // Technology area filter
            if (filters.technology && item.technology_area !== filters.technology) {
                return false;
            }
            
            // Role filter
            if (filters.role && (!item.role || !item.role.includes(filters.role))) {
                return false;
            }
            
            // Leader filter
            if (filters.leader && (!item.leader || !item.leader.includes(filters.leader))) {
                return false;
            }
            
            // Person filter
            if (filters.person && !item.person.includes(filters.person)) {
                return false;
            }
            
            return true;
        });
    },
    
    /**
     * Get data for a specific account
     * @param {string} accountName - Account name
     * @param {string} viewMode - 'raw' or 'fte'
     * @returns {Object} Account details
     */
    getAccountDetails: function(accountName, viewMode) {
        // Filter data for the specific account
        const accountData = this.rawData.filter(item => item.account === accountName);
        
        // Get technology breakdown
        const techBreakdown = {};
        
        if (viewMode === 'raw') {
            // Raw count
            accountData.forEach(item => {
                const tech = item.technology_area;
                techBreakdown[tech] = (techBreakdown[tech] || 0) + 1;
            });
        } else {
            // FTE allocation
            accountData.forEach(item => {
                const tech = item.technology_area;
                const allocation = this.personAllocations[item.person];
                techBreakdown[tech] = (techBreakdown[tech] || 0) + allocation;
            });
        }
        
        // Get role breakdown
        const roleBreakdown = {};
        
        if (viewMode === 'raw') {
            // Raw count
            accountData.forEach(item => {
                const role = item.role || 'Unspecified';
                roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
            });
        } else {
            // FTE allocation
            accountData.forEach(item => {
                const role = item.role || 'Unspecified';
                const allocation = this.personAllocations[item.person];
                roleBreakdown[role] = (roleBreakdown[role] || 0) + allocation;
            });
        }
        
        // Prepare people list
        const peopleList = accountData.map(item => {
            const result = {
                person: item.person,
                role: item.role || '',
                technology_area: item.technology_area
            };
            
            // Add allocation if in FTE mode
            if (viewMode === 'fte') {
                result.allocation = this.personAllocations[item.person];
            }
            
            return result;
        });
        
        // Calculate total FTE if needed
        let totalFTE = 0;
        if (viewMode === 'fte') {
            accountData.forEach(item => {
                totalFTE += this.personAllocations[item.person];
            });
        }
        
        return {
            account: accountName,
            total_people: accountData.length,
            total_fte: totalFTE,
            tech_breakdown: techBreakdown,
            role_breakdown: roleBreakdown,
            people: peopleList
        };
    }
};