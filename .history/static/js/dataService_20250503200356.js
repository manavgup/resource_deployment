/**
 * Data service for the Account Deployment Dashboard
 * Handles all data loading, processing, and FTE calculations
 */
const dataService = {
    // Raw data storage
    rawData: [],
    
    // Processed data
    accountCounts: {},
    brandByAccount: {},
    accountFTE: {},
    brandFTEByAccount: {},
    personAllocations: {},
    
    // Filter options
    filterOptions: {
        brands: [],
        accounts: [],
        slms: [],
        flms: []
    },
    
    /**
     * Load data from Excel file
     * @param {File} file - Excel file to load
     * @returns {Promise} Promise resolving when data is loaded
     */
    loadExcelFile: function(file) {
        return excelParser.parseExcelFile(file)
            .then(data => {
                this.rawData = data;
                this.logDebug(`Loaded ${this.rawData.length} records from Excel file`);
                this.processData();
                this.extractFilterOptions();
                return this.rawData;
            });
    },
    
    /**
     * Process raw data to calculate counts and FTE allocations
     */
    processData: function() {
        // Reset processed data
        this.accountCounts = {};
        this.brandByAccount = {};
        this.accountFTE = {};
        this.brandFTEByAccount = {};
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
            this.logDebug("Sample allocations:");
            samplePeople.forEach(person => {
                this.logDebug(`  ${person}: ${this.personAllocations[person].toFixed(2)} FTE (on ${personAccounts[person].size} accounts)`);
            });
        }
        
        // Now process the raw data to calculate counts and FTE
        this.rawData.forEach(item => {
            const { account, brand, person } = item;
            const allocation = this.personAllocations[person];
            
            // Initialize if needed for raw counts
            if (!this.accountCounts[account]) {
                this.accountCounts[account] = 0;
                this.brandByAccount[account] = {};
            }
            
            // Initialize if needed for FTE
            if (!this.accountFTE[account]) {
                this.accountFTE[account] = 0;
                this.brandFTEByAccount[account] = {};
            }
            
            // Raw counts
            this.accountCounts[account]++;
            if (!this.brandByAccount[account][brand]) {
                this.brandByAccount[account][brand] = 0;
            }
            this.brandByAccount[account][brand]++;
            
            // FTE allocations
            this.accountFTE[account] += allocation;
            if (!this.brandFTEByAccount[account][brand]) {
                this.brandFTEByAccount[account][brand] = 0;
            }
            this.brandFTEByAccount[account][brand] += allocation;
        });
        
        if (config.debug) {
            // Log the top accounts for both raw count and FTE
            const topAccounts = Object.entries(this.accountCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
                
            this.logDebug("Top 5 accounts by raw count:");
            topAccounts.forEach(([account, count]) => {
                this.logDebug(`  ${account}: ${count} people`);
            });
            
            this.logDebug("Top 5 accounts by FTE:");
            topAccounts.forEach(([account]) => {
                this.logDebug(`  ${account}: ${this.accountFTE[account].toFixed(2)} FTE`);
            });
        }
    },
    
    /**
     * Extract filter options from parsed data
     */
    extractFilterOptions: function() {
        // Clear existing options
        this.filterOptions = {
            brands: [],
            accounts: [],
            slms: [],
            flms: []
        };
        
        // Create sets for unique values
        const brands = new Set();
        const accounts = new Set();
        const slms = new Set();
        const flms = new Set();
        
        // Extract unique values
        this.rawData.forEach(item => {
            brands.add(item.brand);
            accounts.add(item.account);
            
            if (item.slm) slms.add(item.slm);
            if (item.flm) flms.add(item.flm);
        });
        
        // Convert sets to sorted arrays
        this.filterOptions.brands = Array.from(brands).sort();
        this.filterOptions.accounts = Array.from(accounts).sort();
        this.filterOptions.slms = Array.from(slms).sort();
        this.filterOptions.flms = Array.from(flms).sort();
        
        this.logDebug(`Extracted filter options: ${this.filterOptions.brands.length} brands, ${this.filterOptions.accounts.length} accounts`);
    },
    
    /**
     * Get data for the specified view mode
     * @param {string} viewMode - 'raw' or 'fte'
     * @returns {Object} Appropriate data for the view mode
     */
    getDataForViewMode: function(viewMode) {
        return {
            accountData: viewMode === 'raw' ? this.accountCounts : this.accountFTE,
            brandData: viewMode === 'raw' ? this.brandByAccount : this.brandFTEByAccount
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
            // Brand filter
            if (filters.brand && item.brand !== filters.brand) {
                return false;
            }
            
            // Account filter
            if (filters.account && item.account !== filters.account) {
                return false;
            }
            
            // SLM filter
            if (filters.slm && item.slm !== filters.slm) {
                return false;
            }
            
            // FLM filter
            if (filters.flm && item.flm !== filters.flm) {
                return false;
            }
            
            // Person filter
            if (filters.person && !item.person.toLowerCase().includes(filters.person.toLowerCase())) {
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
        
        // Get brand breakdown
        const brandBreakdown = {};
        
        if (viewMode === 'raw') {
            // Raw count
            accountData.forEach(item => {
                const brand = item.brand;
                brandBreakdown[brand] = (brandBreakdown[brand] || 0) + 1;
            });
        } else {
            // FTE allocation
            accountData.forEach(item => {
                const brand = item.brand;
                const allocation = this.personAllocations[item.person];
                brandBreakdown[brand] = (brandBreakdown[brand] || 0) + allocation;
            });
        }
        
        // Prepare people list
        const peopleList = accountData.map(item => {
            const result = {
                brand: item.brand,
                slm: item.slm,
                flm: item.flm,
                person: item.person,
                role: item.role || ''
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
            brand_breakdown: brandBreakdown,
            people: peopleList
        };
    },
    
    /**
     * Generate hierarchical data for organization chart
     * @param {Array} data - Filtered data array
     * @returns {Object} Hierarchical data for org chart
     */
    generateHierarchicalData: function(data) {
        // Create a hierarchical structure: Account -> SLM -> FLM -> Person
        const hierarchy = {};
        
        data.forEach(item => {
            const { account, brand, slm, flm, person } = item;
            
            // Initialize account if needed
            if (!hierarchy[account]) {
                hierarchy[account] = {
                    name: account,
                    children: {}
                };
            }
            
            // If no SLM/FLM, add person directly to account
            if (!slm && !flm) {
                if (!hierarchy[account].people) {
                    hierarchy[account].people = [];
                }
                hierarchy[account].people.push({
                    name: person,
                    brand,
                    allocation: this.personAllocations[person]
                });
                return;
            }
            
            // Initialize SLM if needed
            if (slm && !hierarchy[account].children[slm]) {
                hierarchy[account].children[slm] = {
                    name: slm,
                    role: 'SLM',
                    brand,
                    children: {}
                };
            }
            
            // If no FLM, add person directly to SLM
            if (slm && !flm) {
                if (!hierarchy[account].children[slm].people) {
                    hierarchy[account].children[slm].people = [];
                }
                hierarchy[account].children[slm].people.push({
                    name: person,
                    brand,
                    allocation: this.personAllocations[person]
                });
                return;
            }
            
            // Initialize FLM if needed
            if (slm && flm && !hierarchy[account].children[slm].children[flm]) {
                hierarchy[account].children[slm].children[flm] = {
                    name: flm,
                    role: 'FLM',
                    brand,
                    people: []
                };
            }
            
            // Add person to FLM
            if (slm && flm) {
                hierarchy[account].children[slm].children[flm].people.push({
                    name: person,
                    brand,
                    allocation: this.personAllocations[person]
                });
            }
        });
        
        // Convert the nested object to a hierarchical array structure
        const result = Object.values(hierarchy).map(account => {
            const accountNode = {
                name: account.name,
                children: []
            };
            
            // Add direct people to account if any
            if (account.people && account.people.length > 0) {
                accountNode.children.push(...account.people);
            }
            
            // Add SLMs and their children
            Object.values(account.children).forEach(slm => {
                const slmNode = {
                    name: slm.name,
                    role: slm.role,
                    brand: slm.brand,
                    children: []
                };
                
                // Add direct people to SLM if any
                if (slm.people && slm.people.length > 0) {
                    slmNode.children.push(...slm.people);
                }
                
                // Add FLMs and their people
                Object.values(slm.children).forEach(flm => {
                    const flmNode = {
                        name: flm.name,
                        role: flm.role,
                        brand: flm.brand,
                        children: flm.people || []
                    };
                    
                    slmNode.children.push(flmNode);
                });
                
                accountNode.children.push(slmNode);
            });
            
            return accountNode;
        });
        
        return result;
    },
    
    /**
     * Get all the people from a specific SLM or FLM
     * @param {string} managerName - Name of the manager (SLM or FLM)
     * @param {string} managerType - Type of manager ('slm' or 'flm')
     * @returns {Array} Array of people reporting to the manager
     */
    getPeopleByManager: function(managerName, managerType) {
        return this.rawData.filter(item => item[managerType] === managerName);
    },
    
    /**
     * Log debug information if debug mode is enabled
     * @param {string} message - Debug message
     */
    logDebug: function(message) {
        if (config.debug) {
            console.log(`[DataService] ${message}`);
            
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