/**
 * Data service for the Account Deployment Dashboard
 * Handles all data loading, processing, and FTE calculations
 */
const dataService = {
    // Raw data storage
    rawData: [],
    quotaData: [], // Raw quota data from QUOTA sheet

    // Processed data
    accountCounts: {}, // Raw row counts per account
    brandByAccount: {}, // Raw row counts per brand within account
    accountFTE: {}, // FTE sum per account
    brandFTEByAccount: {}, // FTE sum per brand within account
    accountUniquePeopleCount: {}, // Count of unique people per account
    personAllocations: {},
    hasQuotaData: false, // Flag to indicate if quota data is available

    // Filter options
    filterOptions: {
        brands: [],
        accounts: [],
        slms: [],
        flms: [],
        personTypes: [] // New filter for CE/CSM person types
    },

    /**
     * Load data from Excel file with proper promise return
     * @param {File} file - Excel file to load
     * @returns {Promise} Promise resolving when data is loaded
     */
    loadExcelFile: function(file) {
        console.log(`[LOG] Entering dataService.loadExcelFile: ${file.name}`); // Added Log

        // Make sure we return the Promise
        console.log("[LOG] Calling excelParser.parseExcelFile..."); // Added Log
        return excelParser.parseExcelFile(file)
            .then(data => {
                console.log(`[LOG] excelParser.parseExcelFile promise resolved. Loaded ${data.length} raw records.`); // Added Log
                
                // Check if quota data is available
                if (data.quotaData && Array.isArray(data.quotaData) && data.quotaData.length > 0) {
                    console.log(`[LOG] Quota data found with ${data.quotaData.length} records.`);
                    this.quotaData = data.quotaData;
                    this.hasQuotaData = true;
                    
                    // Remove quotaData from the main data array to avoid processing it as regular data
                    delete data.quotaData;
                } else {
                    console.log(`[LOG] No quota data found.`);
                    this.quotaData = [];
                    this.hasQuotaData = false;
                }
                
                this.rawData = data;

                // Filter quota data to exclude accounts not in rawData
                if (this.hasQuotaData && this.rawData.length > 0) {
                    console.log("[LOG] Filtering quota data based on accounts in rawData...");
                    const accountsInRawData = new Set(this.rawData.map(item => item.account).filter(account => account && account !== 'N/A'));
                    const originalQuotaCount = this.quotaData.length;
                    this.quotaData = this.quotaData.filter(item => accountsInRawData.has(item.territoryTypeName));
                    console.log(`[LOG] Filtered quota data: ${originalQuotaCount} original records, ${this.quotaData.length} remaining.`);
                }


                // Process the data
                console.log("[LOG] Calling dataService.processData..."); // Added Log
                this.processData();
                console.log(`[LOG] dataService.processData finished. Processed data into ${Object.keys(this.accountCounts).length} accounts`); // Added Log

                // Process quota data if available
                if (this.hasQuotaData) {
                    console.log("[LOG] Calling dataService.processQuotaData...");
                    this.processQuotaData();
                    console.log("[LOG] dataService.processQuotaData finished.");
                }

                // Extract filter options
                console.log("[LOG] Calling dataService.extractFilterOptions..."); // Added Log
                this.extractFilterOptions();
                console.log(`[LOG] dataService.extractFilterOptions finished. Extracted filter options: ${this.filterOptions.brands.length} brands, ${this.filterOptions.accounts.length} accounts`); // Added Log

                console.log(`[LOG] Exiting dataService.loadExcelFile (success)`); // Added Log
                // Return the rawData for promise chaining
                return this.rawData;
            })
            .catch(error => {
                // Log error
                console.error(`[LOG] Error loading Excel file in dataService:`, error); // Added Log
                console.log(`[LOG] Exiting dataService.loadExcelFile (with error)`); // Added Log
                // Re-throw to propagate the error up the promise chain
                throw error;
             });
     },
 
     /**
      * Load data directly from a JSON array (e.g., pre-loaded sample data)
      * @param {Array} jsonData - Array of data objects matching the expected structure
      * @returns {boolean} True if data was loaded and processed, false otherwise
      */
     loadJsonData: function(jsonData) {
         console.log(`[LOG] Entering dataService.loadJsonData with ${jsonData.length} records.`); // Added Log
         if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
             console.error("[LOG] Invalid or empty JSON data provided to loadJsonData.");
             return false;
         }
 
         try {
             // Check if quota data is available in the JSON data
             if (jsonData.quotaData && Array.isArray(jsonData.quotaData) && jsonData.quotaData.length > 0) {
                 console.log(`[LOG] Quota data found in JSON with ${jsonData.quotaData.length} records.`);
                 this.quotaData = jsonData.quotaData;
                 this.hasQuotaData = true;
                 
                 // Remove quotaData from the main data array to avoid processing it as regular data
                 delete jsonData.quotaData;
             } else {
                 console.log(`[LOG] No quota data found in JSON.`);
                 this.quotaData = [];
                 this.hasQuotaData = false;
             }
             
             // Set rawData
             this.rawData = jsonData;
             console.log(`[LOG] Set rawData from JSON.`);
 
             // Process the data (calculates FTE, counts, etc.)
             console.log("[LOG] Calling dataService.processData from loadJsonData..."); // Added Log
             this.processData();
             console.log(`[LOG] dataService.processData finished. Processed data into ${Object.keys(this.accountCounts).length} accounts`); // Added Log
 
             // Process quota data if available
             if (this.hasQuotaData) {
                 console.log("[LOG] Calling dataService.processQuotaData from loadJsonData...");
                 this.processQuotaData();
                 console.log("[LOG] dataService.processQuotaData finished.");
             }
 
             // Extract filter options
             console.log("[LOG] Calling dataService.extractFilterOptions from loadJsonData..."); // Added Log
             this.extractFilterOptions();
             console.log(`[LOG] dataService.extractFilterOptions finished. Extracted filter options: ${this.filterOptions.brands.length} brands, ${this.filterOptions.accounts.length} accounts`); // Added Log
 
             console.log(`[LOG] Exiting dataService.loadJsonData (success)`); // Added Log
             return true; // Indicate success
         } catch (error) {
             console.error("[LOG] Error processing JSON data in loadJsonData:", error);
             // Reset data potentially?
             this.rawData = [];
             this.accountCounts = {};
             this.brandByAccount = {};
             this.accountFTE = {};
             this.brandFTEByAccount = {};
             this.accountUniquePeopleCount = {};
             this.personAllocations = {};
             this.filterOptions = { brands: [], accounts: [], slms: [], flms: [] };
             console.log(`[LOG] Exiting dataService.loadJsonData (with error)`); // Added Log
             return false; // Indicate failure
         }
     },
 
     /**
      * Process raw data to calculate counts and FTE allocations
      */
    processData: function() {
        console.log("[LOG] Entering dataService.processData"); // Added Log

        // Reset processed data
        this.accountCounts = {};
        this.brandByAccount = {};
        this.accountFTE = {};
        this.brandFTEByAccount = {};
        this.accountUniquePeopleCount = {}; // Reset unique count
        this.personAllocations = {};

        // First, count how many accounts each person appears on
        console.log("[LOG] Calculating person allocations..."); // Added Log
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
        console.log(`[LOG] Calculated allocations for ${Object.keys(this.personAllocations).length} unique people.`); // Added Log


        if (config.debug) {
            const samplePeople = Object.keys(this.personAllocations).slice(0, 5);
            this.logDebug("Sample allocations:");
            samplePeople.forEach(person => {
                this.logDebug(`  ${person}: ${this.personAllocations[person].toFixed(2)} FTE (on ${personAccounts[person].size} accounts)`);
            });
        }

        // Now process the raw data to calculate counts, FTE, and unique people
        console.log("[LOG] Aggregating data for counts, FTE, and unique people..."); // Added Log
        const uniquePeoplePerAccount = {}; // Temporary structure to hold sets of people

        this.rawData.forEach(item => {
            const { account, brand, person } = item;
            const allocation = this.personAllocations[person];

            // Initialize temporary set for unique people count if needed
            if (!uniquePeoplePerAccount[account]) {
                uniquePeoplePerAccount[account] = new Set();
            }
            uniquePeoplePerAccount[account].add(person); // Add person to the set for the account

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

        // Calculate final unique people counts from the sets
        for (const account in uniquePeoplePerAccount) {
            this.accountUniquePeopleCount[account] = uniquePeoplePerAccount[account].size;
        }
        console.log(`[LOG] Calculated unique people counts for ${Object.keys(this.accountUniquePeopleCount).length} accounts.`); // Added Log

        console.log("[LOG] Data aggregation finished."); // Added Log


        if (config.debug) {
            // Log the top accounts for both raw count and FTE
            const topAccounts = Object.entries(this.accountCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            this.logDebug("Top 5 accounts by raw count:");
            topAccounts.forEach(([account, count]) => {
                this.logDebug(`  ${account}: ${count} people`);
            });

            const topAccountsFTE = Object.entries(this.accountFTE)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            this.logDebug("Top 5 accounts by FTE:");
            topAccountsFTE.forEach(([account, fte]) => {
                this.logDebug(`  ${account}: ${fte.toFixed(2)} FTE`);
            });

            const topAccountsUnique = Object.entries(this.accountUniquePeopleCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            this.logDebug("Top 5 accounts by Unique People Count:");
            topAccountsUnique.forEach(([account, count]) => {
                this.logDebug(`  ${account}: ${count} unique people`);
            });
        }

        console.log("[LOG] Exiting dataService.processData"); // Added Log
    },

    /**
     * Extract filter options from parsed data
     */
    extractFilterOptions: function() {
        console.log("[LOG] Entering dataService.extractFilterOptions"); // Added Log
        // Clear existing options
        this.filterOptions = {
            brands: [],
            accounts: [],
            slms: [],
            flms: [],
            personTypes: [] // New filter for CE/CSM person types
        };

        // Create sets for unique values
        const brands = new Set();
        const accounts = new Set();
        const slms = new Set();
        const flms = new Set();
        const personTypes = new Set();

        // Extract unique values
        console.log("[LOG] Extracting unique filter values..."); // Added Log
        this.rawData.forEach(item => {
            brands.add(item.brand);
            accounts.add(item.account);

            // Only add non-empty strings
            if (item.slm && typeof item.slm === 'string' && item.slm.trim() !== '') slms.add(item.slm.trim());
            if (item.flm && typeof item.flm === 'string' && item.flm.trim() !== '') flms.add(item.flm.trim());
            
            // Add person type if available
            if (item.personType && typeof item.personType === 'string' && item.personType.trim() !== '') {
                personTypes.add(item.personType.trim());
            }
        });
        console.log("[LOG] Unique filter values extracted."); // Added Log

        // Convert sets to sorted arrays
        this.filterOptions.brands = Array.from(brands).sort();
        this.filterOptions.accounts = Array.from(accounts).sort();
        this.filterOptions.slms = Array.from(slms).sort();
        this.filterOptions.flms = Array.from(flms).sort();
        this.filterOptions.personTypes = Array.from(personTypes).sort();

        this.logDebug(`Extracted filter options: ${this.filterOptions.brands.length} brands, ${this.filterOptions.accounts.length} accounts, ${this.filterOptions.slms.length} SLMs, ${this.filterOptions.flms.length} FLMs, ${this.filterOptions.personTypes.length} person types`); // Added detailed log

        console.log("[LOG] Exiting dataService.extractFilterOptions"); // Added Log
    },

    /**
     * Get data for the specified view mode
     * @param {string} viewMode - 'raw' or 'fte'
     * @returns {Object} Appropriate data for the view mode
     */
    getDataForViewMode: function(viewMode) {
        console.log(`[LOG] Entering dataService.getDataForViewMode with viewMode: ${viewMode}`); // Added Log
        const result = {
            accountData: viewMode === 'raw' ? this.accountCounts : this.accountFTE,
            brandData: viewMode === 'raw' ? this.brandByAccount : this.brandFTEByAccount
        };
        console.log(`[LOG] Exiting dataService.getDataForViewMode. Returning data for ${viewMode}.`); // Added Log
        return result;
    },

    /**
     * Get allocation value for a person
     * @param {string} person - Person name
     * @returns {number} Allocation value (or 1.0 if not found)
     */
    getAllocationForPerson: function(person) {
        // This is a utility function, extensive logging might be noisy
        return this.personAllocations[person] || 1.0;
    },

    /**
     * Filter data based on criteria
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered data array
     */
    filterData: function(filters) {
        console.log("[LOG] Entering dataService.filterData with filters:", filters); // Added Log
        const filtered = this.rawData.filter(item => {
            // Brand filter
            if (filters.brand && item.brand !== filters.brand) {
                return false;
            }

            // Account filter
            if (filters.account && item.account !== filters.account) {
                return false;
            }

            // SLM filter (handle empty strings consistently)
            if (filters.slm && (item.slm || '').trim() !== filters.slm.trim()) {
                 // Special case: If filter is for "All SLMs" (empty string), this condition should be true, but the initial check 'filters.slm' prevents this.
                 // The logic below correctly handles empty strings in item.slm
                 if (filters.slm.trim() === "" && (item.slm || '').trim() !== "") return true; // If filter is all and item has a value, include
                 if (filters.slm.trim() !== "" && (item.slm || '').trim() === filters.slm.trim()) return true; // If filter has value and item matches, include
                 if (filters.slm.trim() === "" && (item.slm || '').trim() === "") return true; // If filter is all and item is empty, include
                 if (filters.slm.trim() !== "" && (item.slm || '').trim() !== filters.slm.trim()) return false; // If filter has value and item doesn't match, exclude
                 return false; // Default exclusion if none of above match
            }

            // FLM filter (handle empty strings consistently)
             if (filters.flm && (item.flm || '').trim() !== filters.flm.trim()) {
                 // Special case: If filter is for "All FLMs" (empty string), this condition should be true, but the initial check 'filters.flm' prevents this.
                 // The logic below correctly handles empty strings in item.flm
                 if (filters.flm.trim() === "" && (item.flm || '').trim() !== "") return true; // If filter is all and item has a value, include
                 if (filters.flm.trim() !== "" && (item.flm || '').trim() === filters.flm.trim()) return true; // If filter has value and item matches, include
                 if (filters.flm.trim() === "" && (item.flm || '').trim() === "") return true; // If filter is all and item is empty, include
                 if (filters.flm.trim() !== "" && (item.flm || '').trim() !== filters.flm.trim()) return false; // If filter has value and item doesn't match, exclude
                 return false; // Default exclusion if none of above match
            }

            // Person filter - check both name and specialty/role
            if (filters.person) {
                const searchTerm = filters.person.toLowerCase();
                const personName = (item.person || '').toLowerCase();
                const specialty = (item.specialty || '').toLowerCase();
                const role = (item.role || '').toLowerCase();
                
                // Check if search term is in person name, specialty, or role
                if (!personName.includes(searchTerm) && 
                    !specialty.includes(searchTerm) && 
                    !role.includes(searchTerm)) {
                    return false;
                }
            }

            // Person Type filter (if we add this in the future)
            if (filters.personType && item.personType !== filters.personType) {
                return false;
            }

            return true;
        });
        console.log(`[LOG] Exiting dataService.filterData. Returning ${filtered.length} records.`); // Added Log
        return filtered;
    },

    /**
     * Get data for a specific account
     * @param {string} accountName - Account name
     * @param {string} viewMode - 'raw' or 'fte'
     * @returns {Object} Account details
     */
    getAccountDetails: function(accountName, viewMode) {
        console.log(`[LOG] Entering dataService.getAccountDetails for account: ${accountName}, viewMode: ${viewMode}`); // Added Log

        // Filter data for the specific account
        console.log(`[LOG] Filtering rawData for account: ${accountName}`); // Added Log
        const accountData = this.rawData.filter(item => item.account === accountName);
        console.log(`[LOG] Found ${accountData.length} raw records for account: ${accountName}`); // Added Log


        // Get brand breakdown
        console.log("[LOG] Calculating brand breakdown for account details..."); // Added Log
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
        console.log("[LOG] Brand breakdown calculation finished.", brandBreakdown); // Added Log


        // Prepare people list
        console.log("[LOG] Preparing people list for account details..."); // Added Log
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

            // Add quota percentage if quota data is available
            if (this.hasQuotaData) {
                const personQuota = this.getQuotaForPerson(item.person);
                const allocation = this.personAllocations[item.person];
                const allocatedQuota = personQuota * allocation;
                
                // Calculate the percentage of the person's total quota allocated to this account
                result.quotaPercentage = personQuota > 0 ? (allocatedQuota / personQuota) * 100 : 0;
                
                // Also store the allocated quota amount for reference
                result.allocatedQuota = allocatedQuota;
            }

            return result;
        });
         console.log(`[LOG] Prepared ${peopleList.length} people entries for account details.`); // Added Log


        // Calculate total FTE if needed
        let totalFTE = 0;
        if (viewMode === 'fte') {
            console.log("[LOG] Calculating total FTE for account details..."); // Added Log
            accountData.forEach(item => {
                totalFTE += this.personAllocations[item.person];
            });
             console.log(`[LOG] Total FTE for ${accountName}: ${totalFTE.toFixed(2)}`); // Added Log
        }

        // Get quota information if available
        let quotaInfo = {};
        if (this.hasQuotaData) {
            console.log("[LOG] Getting quota information for account details...");
            quotaInfo = {
                total_quota: this.getQuotaForAccount(accountName),
                flm_breakdown: this.getQuotaBreakdownByFLMForAccount(accountName),
                slm_breakdown: this.getQuotaBreakdownBySLMForAccount(accountName),
                brand_breakdown: this.getQuotaBreakdownByBrandForAccount(accountName),
                team_breakdown: this.getQuotaBreakdownByTeamForAccount(accountName)
            };
            console.log("[LOG] Quota information retrieved for account details.");
        console.log("[LOG] Team breakdown quota data:", quotaInfo.team_breakdown);
        }

        const result = {
            account: accountName,
            total_people: accountData.length,
            total_fte: totalFTE,
            brand_breakdown: brandBreakdown,
            people: peopleList,
            has_quota: this.hasQuotaData,
            quota: quotaInfo
        };

        console.log(`[LOG] Exiting dataService.getAccountDetails for account: ${accountName}`); // Added Log
        return result;
    },

    /**
     * Generate hierarchical data for organization chart
     * @param {Array} data - Filtered data array
     * @returns {Object} Hierarchical data for org chart
     */
    generateHierarchicalData: function(data) {
         console.log(`[LOG] Entering dataService.generateHierarchicalData with ${data.length} records.`); // Added Log
        // Create a hierarchical structure: Account -> SLM -> FLM -> Person
        const hierarchy = {};

        data.forEach(item => {
            const { account, brand, slm, flm, person } = item;

            // Initialize account if needed
            if (!hierarchy[account]) {
                hierarchy[account] = {
                    name: account,
                    children: {} // Use children for managers/sub-nodes
                };
            }

             // Handle empty/null managers by placing people directly under account
             const currentAccountNode = hierarchy[account];

            if (!slm && !flm) {
                if (!currentAccountNode.people) { // Using 'people' array for direct reports
                    currentAccountNode.people = [];
                }
                 // Check if person is already added to avoid duplicates if rawData has duplicates
                 if (!currentAccountNode.people.find(p => p.name === person)) {
                      currentAccountNode.people.push({
                        name: person,
                        brand,
                        allocation: this.personAllocations[person]
                    });
                 }
                return; // Done with this item if no managers
            }


            // Initialize SLM if needed
            if (slm && !currentAccountNode.children[slm]) {
                currentAccountNode.children[slm] = {
                    name: slm,
                    role: 'SLM',
                    // brand: brand, // SLM might cover multiple brands, maybe don't assign brand here?
                    children: {} // Use children for FLMs/sub-nodes
                };
            }

             const currentSlmNode = slm ? currentAccountNode.children[slm] : null;

            // If no FLM, add person directly to SLM
            if (slm && !flm) {
                if (!currentSlmNode.people) { // Using 'people' array for direct reports
                    currentSlmNode.people = [];
                }
                 // Check if person is already added
                 if (!currentSlmNode.people.find(p => p.name === person)) {
                    currentSlmNode.people.push({
                        name: person,
                        brand,
                        allocation: this.personAllocations[person]
                    });
                 }
                return; // Done with this item if no FLM
            }

            // Initialize FLM if needed and add person
             if (slm && flm) {
                 if (!currentSlmNode.children[flm]) {
                     currentSlmNode.children[flm] = {
                         name: flm,
                         role: 'FLM',
                        //  brand: brand, // FLM might cover multiple brands
                         people: [] // Using 'people' array for direct reports
                     };
                 }
                 const currentFlmNode = currentSlmNode.children[flm];
                 // Check if person is already added
                 if (!currentFlmNode.people.find(p => p.name === person)) {
                    currentFlmNode.people.push({
                        name: person,
                        brand,
                        allocation: this.personAllocations[person]
                    });
                 }
             }
        });

        // Convert the nested object to a hierarchical array structure for D3 or similar
        console.log("[LOG] Converting nested hierarchy object to array structure..."); // Added Log
        const result = Object.values(hierarchy).map(account => {
            const accountNode = {
                name: account.name,
                children: []
            };

            // Add direct people to account if any
            if (account.people && account.people.length > 0) {
                accountNode.children.push(...account.people.map(p => ({ ...p, parent: account.name }))); // Add parent ref
            }

            // Add SLMs and their children
            Object.values(account.children).forEach(slm => {
                const slmNode = {
                    name: slm.name,
                    role: slm.role,
                    brand: slm.brand, // Can keep brand for SLM if needed, or remove
                    parent: account.name, // Add parent ref
                    children: []
                };

                 // Add direct people to SLM if any
                if (slm.people && slm.people.length > 0) {
                    slmNode.children.push(...slm.people.map(p => ({ ...p, parent: slm.name }))); // Add parent ref
                }


                // Add FLMs and their people
                Object.values(slm.children).forEach(flm => {
                    const flmNode = {
                        name: flm.name,
                        role: flm.role,
                        brand: flm.brand, // Can keep brand for FLM if needed, or remove
                        parent: slm.name, // Add parent ref
                        children: flm.people ? flm.people.map(p => ({ ...p, parent: flm.name })) : [] // Add parent refs
                    };

                    slmNode.children.push(flmNode);
                });

                accountNode.children.push(slmNode);
            });

            return accountNode;
        }).filter(account => account.children.length > 0); // Filter out accounts with no personnel listed

         console.log(`[LOG] Exiting dataService.generateHierarchicalData. Returning ${result.length} top-level nodes.`); // Added Log

         // Optional: Log the structure (be careful with very large hierarchies)
        // console.log("[LOG] Generated Hierarchy Structure:", result);


        return result; // NOTE: This function is not currently called in app.js/uiService.js
                       // It seems intended for an org chart visualization which isn't implemented.
                       // If the hang occurs before this function is called, it's not the cause.
    },


    /**
     * Get all the people from a specific SLM or FLM
     * @param {string} managerName - Name of the manager (SLM or FLM)
     * @param {string} managerType - Type of manager ('slm' or 'flm')
     * @returns {Array} Array of people reporting to the manager
     */
    getPeopleByManager: function(managerName, managerType) {
         console.log(`[LOG] Entering dataService.getPeopleByManager for ${managerType}: ${managerName}`); // Added Log
        const result = this.rawData.filter(item => item[managerType] === managerName);
         console.log(`[LOG] Exiting dataService.getPeopleByManager. Found ${result.length} people.`); // Added Log
         return result;
    },

    /**
     * Process quota data and initialize quotaService
     */
    processQuotaData: function() {
        console.log("[LOG] Entering dataService.processQuotaData");
        
        if (!this.hasQuotaData || !this.quotaData || this.quotaData.length === 0) {
            console.log("[LOG] No quota data to process.");
            return;
        }
        
        console.log(`[LOG] Processing ${this.quotaData.length} quota records.`);
        
        // Initialize quotaService with the quota data and deployment data
        quotaService.initializeQuotaData(this.quotaData, this.rawData);
        
        console.log("[LOG] Exiting dataService.processQuotaData");
    },
    
    /**
     * Get quota for a specific person
     * @param {string} personName - Person name
     * @returns {number} Quota value (or 0 if not found or quota data not available)
     */
    getQuotaForPerson: function(personName) {
        if (!this.hasQuotaData) return 0;
        return quotaService.getQuotaForPerson(personName);
    },
    
    /**
     * Get quota for a specific account
     * @param {string} accountName - Account name
     * @returns {number} Quota value (or 0 if not found or quota data not available)
     */
    getQuotaForAccount: function(accountName) {
        if (!this.hasQuotaData) return 0;
        return quotaService.getQuotaForAccount(accountName);
    },
    
    /**
     * Get quota breakdown by FLM for a specific account
     * @param {string} accountName - Account name
     * @returns {Object} Map of FLM names to quota values for the account
     */
    getQuotaBreakdownByFLMForAccount: function(accountName) {
        if (!this.hasQuotaData) return {};
        return quotaService.getQuotaBreakdownByFLMForAccount(accountName, this.rawData);
    },
    
    /**
     * Get quota breakdown by SLM for a specific account
     * @param {string} accountName - Account name
     * @returns {Object} Map of SLM names to quota values for the account
     */
    getQuotaBreakdownBySLMForAccount: function(accountName) {
        if (!this.hasQuotaData) return {};
        return quotaService.getQuotaBreakdownBySLMForAccount(accountName, this.rawData);
    },
    
    /**
     * Get quota breakdown by brand for a specific account
     * @param {string} accountName - Account name
     * @returns {Object} Map of brand names to quota values for the account
     */
    getQuotaBreakdownByBrandForAccount: function(accountName) {
        if (!this.hasQuotaData) return {};
        return quotaService.getQuotaBreakdownByBrandForAccount(accountName, this.rawData);
    },
    
    /**
     * Get quota breakdown by team for a specific account
     * @param {string} accountName - Account name
     * @returns {Object} Map of team names to quota values for the account
     */
    getQuotaBreakdownByTeamForAccount: function(accountName) {
        if (!this.hasQuotaData) return {};
        return quotaService.getQuotaBreakdownByTeamForAccount(accountName, this.rawData);
    },
    
    /**
     * Get all team quotas
     * @returns {Object} Map of team names to quota values
     */
    getAllTeamQuotas: function() {
        return this.teamQuotas;
    },
    
    /**
     * Check if quota data is available
     * @returns {boolean} True if quota data is available, false otherwise
     */
    hasQuota: function() {
        return this.hasQuotaData;
    },
    
    /**
     * Get person details including accounts and quota allocation
     * @param {string} personName - Person name
     * @returns {Object} Person details with accounts and quota allocation
     */
    getPersonDetails: function(personName) {
        console.log(`[LOG] Entering dataService.getPersonDetails for person: ${personName}`);
        
        // Filter data for the specific person
        const personData = this.rawData.filter(item => item.person === personName);
        console.log(`[LOG] Found ${personData.length} raw records for person: ${personName}`);
        
        if (personData.length === 0) {
            console.log(`[LOG] No data found for person: ${personName}`);
            return {
                person: personName,
                accounts: []
            };
        }
        
        // Get unique accounts this person is deployed on
        const uniqueAccounts = [...new Set(personData.map(item => item.account))];
        console.log(`[LOG] Person ${personName} is deployed on ${uniqueAccounts.length} unique accounts`);
        
        // Get the person's total quota
        const totalQuota = this.getQuotaForPerson(personName);
        console.log(`[LOG] Total quota for ${personName}: ${totalQuota}`);
        
        // Calculate allocation and quota for each account
        const accountsList = uniqueAccounts.map(account => {
            const allocation = this.personAllocations[personName];
            const allocatedQuota = totalQuota * allocation;
            const quotaPercentage = totalQuota > 0 ? (allocatedQuota / totalQuota) * 100 : 0;
            
            return {
                account: account,
                allocation: allocation,
                allocatedQuota: allocatedQuota,
                quotaPercentage: quotaPercentage
            };
        });
        
        const result = {
            person: personName,
            totalQuota: totalQuota,
            accounts: accountsList
        };
        
        console.log(`[LOG] Exiting dataService.getPersonDetails for person: ${personName}`);
        return result;
    },
    
    /**
     * Log debug information if debug mode is enabled
     * @param {string} message - Debug message
     */
    logDebug: function(message) {
        if (config && config.debug) {
            console.log(`[DataService Debug] ${message}`); // Modified prefix

            // If debug panel exists, log there too
            const debugOutput = document.getElementById('debugOutput'); // Assuming this exists in excel-viewer.html, not index.html
             // Adding a check to see if debugOutput exists before using it
            if (debugOutput) {
                const timestamp = new Date().toLocaleTimeString();
                debugOutput.innerHTML += `<div>[${timestamp}] ${message}</div>`;

                // Auto-scroll to bottom
                debugOutput.scrollTop = debugOutput.scrollHeight;
            }
        }
    }
};
