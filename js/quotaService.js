/**
 * Quota service for the Account Deployment Dashboard
 * Handles all quota calculations and aggregations
 */
const quotaService = {
    // Raw quota data storage
    rawQuotaData: [],

    // Processed quota data
    personQuotas: {}, // Map of person names to their quota values
    managerQuotas: {}, // Map of manager names to aggregated team quotas
    accountQuotas: {}, // Map of account names to aggregated quotas
    brandQuotas: {}, // Map of brand names to aggregated quotas
    teamQuotas: {}, // Map of team names (CE, CSM, BTS, etc.) to aggregated quotas
    
    // Mapping of people to their managers
    personToManager: {},
    
    // Mapping of people to their platforms/brands
    personToPlatform: {},
    
    // Mapping of people to their roles
    personToRole: {},
    
    // Mapping of people to their quota plan type (TQP/IQP)
    personToQuotaPlan: {},
    
    /**
     * Initialize quota data from parsed Excel data
     * @param {Array} quotaData - Array of quota data objects from the QUOTA_PRI sheet
     * @param {Array} deploymentData - Array of deployment data objects from other sheets
     */
    initializeQuotaData: function(quotaData, deploymentData) {
        console.log(`[LOG] Entering quotaService.initializeQuotaData with ${quotaData.length} quota records`);
        
        // Store raw data
        this.rawQuotaData = quotaData;
        
        // Reset processed data
        this.personQuotas = {};
        this.managerQuotas = {};
        this.accountQuotas = {};
        this.brandQuotas = {};
        this.teamQuotas = {};
        this.personToManager = {};
        this.personToPlatform = {};
        this.personToRole = {};
        this.personToQuotaPlan = {};
        
        // Process individual quota data
        this.processIndividualQuotas(quotaData);
        
        // Map deployment data to quota data (This might still be needed for person-to-account mapping)
        this.mapDeploymentToQuota(deploymentData);
        
        // Calculate aggregated quotas
        this.calculateAggregatedQuotas(deploymentData);
        
        console.log(`[LOG] Exiting quotaService.initializeQuotaData. Processed ${Object.keys(this.personQuotas).length} person quotas`);
    },
    
    /**
     * Process individual quota data from the QUOTA_PRI sheet
     * @param {Array} quotaData - Array of quota data objects
     */
    processIndividualQuotas: function(quotaData) {
        console.log(`[LOG] Processing individual quotas for ${quotaData.length} records`);
        
        // Use a map to sum quotas for each seller name
        const sellerQuotaSums = {};
        const sellerManagerMap = {}; // To store manager info per seller

        quotaData.forEach(item => {
            const sellerName = item.sellerName;
            const targetQuotaAmt = parseFloat(item.targetQuotaAmt) || 0;
            const managerName = item.managerName;
            const managerTalentId = item.managerTalentId;

            // Sum quota for each seller
            sellerQuotaSums[sellerName] = (sellerQuotaSums[sellerName] || 0) + targetQuotaAmt;

            // Store manager info (assuming one manager per seller name in this context)
            if (managerName && managerName.trim() !== '') {
                 sellerManagerMap[sellerName] = {
                     name: managerName,
                     talentId: managerTalentId
                 };
            }
        });
        
        // Store individual quotas and manager relationships
        Object.keys(sellerQuotaSums).forEach(sellerName => {
            this.personQuotas[sellerName] = sellerQuotaSums[sellerName];
            if (sellerManagerMap[sellerName]) {
                 this.personToManager[sellerName] = sellerManagerMap[sellerName].name; // Store manager name
                 // If needed, you could store managerTalentId as well
            }
        });

        console.log(`[LOG] Processed ${Object.keys(this.personQuotas).length} individual quotas`);
    },
    
    /**
     * Map deployment data to quota data
     * @param {Array} deploymentData - Array of deployment data objects
     */
    mapDeploymentToQuota: function(deploymentData) {
        console.log(`[LOG] Mapping deployment data to quota data`);
        
        // Create a map of person names to their accounts
        const personToAccounts = {};
        const personToBrands = {};
        
        deploymentData.forEach(item => {
            const personName = item.person;
            const account = item.account;
            const brand = item.brand;
            
            // Skip if no person name or account
            if (!personName || !account) return;
            
            // Initialize arrays if needed
            if (!personToAccounts[personName]) {
                personToAccounts[personName] = [];
            }
            if (!personToBrands[personName]) {
                personToBrands[personName] = [];
            }
            
            // Add account and brand if not already in the arrays
            if (!personToAccounts[personName].includes(account)) {
                personToAccounts[personName].push(account);
            }
            if (!personToBrands[personName].includes(brand)) {
                personToBrands[personName].push(brand);
            }
        });
        
        // Update personToPlatform for people who don't have it set from quota data
        Object.keys(personToBrands).forEach(person => {
            if (!this.personToPlatform[person] && personToBrands[person].length > 0) {
                // Use the first brand as the platform
                this.personToPlatform[person] = personToBrands[person][0];
            }
        });
        
        console.log(`[LOG] Mapped deployment data to quota data`);
    },
    
    /**
     * Calculate aggregated quotas at different levels
     * @param {Array} deploymentData - Array of deployment data objects
     */
    calculateAggregatedQuotas: function(deploymentData) {
        console.log(`[LOG] Calculating aggregated quotas`);
        
        // Calculate manager quotas (sum of team members' quotas)
        this.calculateManagerQuotas();
        
        // Calculate account quotas
        this.calculateAccountQuotas(deploymentData);
        
        // Calculate brand quotas
        this.calculateBrandQuotas(deploymentData);
        
        // Calculate team quotas
        this.calculateTeamQuotas(deploymentData);
        
        console.log(`[LOG] Finished calculating aggregated quotas`);
    },
    
    /**
     * Calculate manager quotas (sum of team members' quotas)
     */
    calculateManagerQuotas: function() {
        console.log(`[LOG] Calculating manager quotas`);
        
        // Reset manager quotas
        this.managerQuotas = {};
        
        // Group people by manager
        const managerToTeam = {};
        
        Object.keys(this.personToManager).forEach(person => {
            const manager = this.personToManager[person];
            
            if (!manager) return;
            
            if (!managerToTeam[manager]) {
                managerToTeam[manager] = [];
            }
            
            managerToTeam[manager].push(person);
        });
        
        // Calculate quota for each manager
        Object.keys(managerToTeam).forEach(manager => {
            const team = managerToTeam[manager];
            let totalQuota = 0;
            
            team.forEach(person => {
                totalQuota += this.personQuotas[person] || 0;
            });
            
            this.managerQuotas[manager] = totalQuota;
        });
        
        console.log(`[LOG] Calculated quotas for ${Object.keys(this.managerQuotas).length} managers`);
    },
    
    /**
     * Calculate account quotas based on QUOTA_PRI data
     * The total quota for an account is the highest value of "Target/Quota Amt"
     * for all rows where the column "Org Code" = TEC for that account.
     */
    calculateAccountQuotas: function() {
        console.log(`[LOG] Calculating account quotas based on QUOTA_PRI data`);
        
        // Reset account quotas
        this.accountQuotas = {};
        
        // Use a map to store the maximum Target/Quota Amt for each account where Org Code is TEC
        const accountMaxQuotaTEC = {};
        
        this.rawQuotaData.forEach(item => {
            const territoryTypeName = item.territoryTypeName;
            const orgCode = item.orgCode;
            const targetQuotaAmt = parseFloat(item.targetQuotaAmt) || 0;
            
            // Only consider rows where Org Code is TEC
            if (orgCode === 'TEC') {
                // If this is the first time we see this account with Org Code TEC,
                // or if the current targetQuotaAmt is higher than the stored maximum, update the maximum.
                if (!accountMaxQuotaTEC[territoryTypeName] || targetQuotaAmt > accountMaxQuotaTEC[territoryTypeName]) {
                    accountMaxQuotaTEC[territoryTypeName] = targetQuotaAmt;
                }
            }
        });
        
        // Store the calculated maximum quotas as account quotas
        this.accountQuotas = accountMaxQuotaTEC;
        
        console.log(`[LOG] Calculated quotas for ${Object.keys(this.accountQuotas).length} accounts`);
    },
    
    /**
     * Calculate brand quotas
     * @param {Array} deploymentData - Array of deployment data objects
     */
    calculateBrandQuotas: function(deploymentData) {
        console.log(`[LOG] Calculating brand quotas`);
        
        // Reset brand quotas
        this.brandQuotas = {};
        
        // Group people by brand
        const brandToPeople = {};
        
        deploymentData.forEach(item => {
            const brand = item.brand;
            const person = item.person;
            
            if (!brand || !person) return;
            
            if (!brandToPeople[brand]) {
                brandToPeople[brand] = new Set();
            }
            
            brandToPeople[brand].add(person);
        });
        
        // Calculate quota for each brand
        Object.keys(brandToPeople).forEach(brand => {
            const people = Array.from(brandToPeople[brand]);
            let totalQuota = 0;
            
            people.forEach(person => {
                // Get the person's quota
                const personQuota = this.personQuotas[person] || 0;
                
                // Get the number of brands the person is assigned to
                const personBrands = deploymentData
                    .filter(item => item.person === person)
                    .map(item => item.brand)
                    .filter((value, index, self) => self.indexOf(value) === index); // Unique brands
                
                // Calculate the quota allocation for this brand
                const allocation = personBrands.length > 0 ? 1.0 / personBrands.length : 0;
                const allocatedQuota = personQuota * allocation;
                
                totalQuota += allocatedQuota;
            });
            
            this.brandQuotas[brand] = totalQuota;
        });
        
        console.log(`[LOG] Calculated quotas for ${Object.keys(this.brandQuotas).length} brands`);
    },
    
    /**
     * Calculate team quotas (CE, CSM, BTS, etc.)
     * @param {Array} deploymentData - Array of deployment data objects
     */
    calculateTeamQuotas: function(deploymentData) {
        console.log(`[LOG] Calculating team quotas`);
        
        // Reset team quotas
        this.teamQuotas = {};
        
        // Group people by team
        const teamToPeople = {};
        
        // Add teams explicitly to ensure they're always present, even if no people are initially assigned
        teamToPeople['CE'] = new Set();
        teamToPeople['CSM'] = new Set();
        teamToPeople['BTS'] = new Set();
        // Add other potential teams if known, or they will be added dynamically

        console.log(`[LOG] Processing ${deploymentData.length} deployment records for team assignment.`);

        deploymentData.forEach(item => {
            const person = item.person;
            if (!person || person === 'N/A') {
                console.log(`[LOG] Skipping deployment item with no person:`, item);
                return; // Skip if no person name
            }

            let team = '';

            // --- Team Assignment Logic ---
            // Prioritize identifying CE personnel using Org Code from QUOTA_PRI
            const quotaItem = this.rawQuotaData.find(quota => quota.sellerName === person);
            if (quotaItem && quotaItem.orgCode === 'CEN') {
                team = 'CE';
                console.log(`[LOG] Assigned person ${person} to team ${team} based on QUOTA_PRI Org Code 'CEN'.`);
            }

            // If not identified as CE by Org Code, try personType from deployment data (CE, CSM)
            if (!team && item.personType && item.personType.trim() !== '') {
                team = item.personType.trim();
                console.log(`[LOG] Assigned person ${person} to team ${team} based on personType.`);
            }

            // If still no team, try role from deployment data
            if (!team && item.role && item.role.trim() !== '') {
                 const role = item.role.trim();
                 if (role.includes('BTS') || role.includes('Brand Technical Specialist')) {
                     team = 'BTS';
                     console.log(`[LOG] Assigned person ${person} to team ${team} based on deployment role: ${role}.`);
                 } else if (role.includes('CE') || role.includes('Client Engineering')) {
                     team = 'CE';
                     console.log(`[LOG] Assigned person ${person} to team ${team} based on deployment role: ${role}.`);
                 } else if (role.includes('CSM') || role.includes('Customer Success')) {
                     team = 'CSM';
                     console.log(`[LOG] Assigned person ${person} to team ${team} based on deployment role: ${role}.`);
                 } else {
                     // If role doesn't match known teams, use the role itself as the team name
                     team = role;
                     console.log(`[LOG] Assigned person ${person} to team ${team} based on deployment role (unknown type): ${role}.`);
                 }
            }

            // If still no team, try role from quota data (if available) - Less reliable than deployment data role
            if (!team && this.personToRole[person] && this.personToRole[person].trim() !== '') {
                const role = this.personToRole[person].trim();
                 if (role.includes('BTS') || role.includes('Brand Technical Specialist')) {
                     team = 'BTS';
                     console.log(`[LOG] Assigned person ${person} to team ${team} based on quota role: ${role}.`);
                 } else if (role.includes('CE') || role.includes('Client Engineering')) {
                     team = 'CE';
                     console.log(`[LOG] Assigned person ${person} to team ${team} based on quota role: ${role}.`);
                 } else if (role.includes('CSM') || role.includes('Customer Success')) {
                     team = 'CSM';
                     console.log(`[LOG] Assigned person ${person} to team ${team} based on quota role: ${role}.`);
                 } else {
                     // If role doesn't match known teams, use the role itself as the team name
                     team = role;
                     console.log(`[LOG] Assigned person ${person} to team ${team} based on quota role (unknown type): ${role}.`);
                 }
            }
            
            // If still no team, try brand from deployment data as a last resort
            if (!team && item.brand && item.brand.trim() !== '' && item.brand !== 'N/A') {
                 team = item.brand.trim();
                 console.log(`[LOG] Assigned person ${person} to team ${team} based on brand.`);
            }
            // --- End Team Assignment Logic ---


            // If a team was determined, add the person to the team's set
            if (team && team.trim() !== '') {
                if (!teamToPeople[team]) {
                    teamToPeople[team] = new Set();
                }
                teamToPeople[team].add(person);
                console.log(`[LOG] Added person ${person} to team ${team} set.`);
            } else {
                 console.log(`[LOG] Person ${person} could not be assigned to a team.`);
            }
        });
        
        console.log(`[LOG] Finished grouping people by team. Found ${Object.keys(teamToPeople).length} teams.`);
        console.log(`[LOG] Team groupings:`, teamToPeople);


        // Calculate quota for each team
        Object.keys(teamToPeople).forEach(team => {
            const people = Array.from(teamToPeople[team]);
            let totalQuota = 0;
            
            console.log(`[LOG] Calculating total quota for team: ${team} with ${people.length} members.`);

            people.forEach(person => {
                const personQuota = this.personQuotas[person] || 0;
                totalQuota += personQuota;
                console.log(`[LOG]   Adding ${person}'s quota (${personQuota}) to team ${team}.`);
            });
            
            this.teamQuotas[team] = totalQuota;
            console.log(`[LOG] Total quota for team ${team}: ${totalQuota}`);
        });
        
        console.log(`[LOG] Calculated quotas for ${Object.keys(this.teamQuotas).length} teams`);
        console.log(`[LOG] Final team quotas:`, this.teamQuotas);
    },
    
    /**
     * Get quota for a specific person
     * @param {string} personName - Person name
     * @returns {number} Quota value
     */
    getQuotaForPerson: function(personName) {
        return this.personQuotas[personName] || 0;
    },
    
    /**
     * Get quota for a specific manager
     * @param {string} managerName - Manager name
     * @returns {number} Quota value
     */
    getQuotaForManager: function(managerName) {
        return this.managerQuotas[managerName] || 0;
    },
    
    /**
     * Get quota for a specific account
     * @param {string} accountName - Account name
     * @returns {number} Quota value
     */
    getQuotaForAccount: function(accountName) {
        return this.accountQuotas[accountName] || 0;
    },
    
    /**
     * Get quota for a specific brand
     * @param {string} brandName - Brand name
     * @returns {number} Quota value
     */
    getQuotaForBrand: function(brandName) {
        return this.brandQuotas[brandName] || 0;
    },
    
    /**
     * Get quota for a specific team
     * @param {string} teamName - Team name
     * @returns {number} Quota value
     */
    getQuotaForTeam: function(teamName) {
        return this.teamQuotas[teamName] || 0;
    },
    
    /**
     * Get all person quotas
     * @returns {Object} Map of person names to quota values
     */
    getAllPersonQuotas: function() {
        return this.personQuotas;
    },
    
    /**
     * Get all manager quotas
     * @returns {Object} Map of manager names to quota values
     */
    getAllManagerQuotas: function() {
        return this.managerQuotas;
    },
    
    /**
     * Get all account quotas
     * @returns {Object} Map of account names to quota values
     */
    getAllAccountQuotas: function() {
        return this.accountQuotas;
    },
    
    /**
     * Get all brand quotas
     * @returns {Object} Map of brand names to quota values
     */
    getAllBrandQuotas: function() {
        return this.brandQuotas;
    },
    
    /**
     * Get all team quotas
     * @returns {Object} Map of team names to quota values
     */
    getAllTeamQuotas: function() {
        return this.teamQuotas;
    },
    
    /**
     * Get quota breakdown by FLM for a specific account
     * @param {string} accountName - Account name
     * @param {Array} deploymentData - Array of deployment data objects
     * @returns {Object} Map of FLM names to quota values for the account
     */
    getQuotaBreakdownByFLMForAccount: function(accountName, deploymentData) {
        console.log(`[LOG] Getting quota breakdown by FLM for account: ${accountName}`);
        
        const flmQuotas = {};
        
        // Filter deployment data for the specified account
        const accountData = deploymentData.filter(item => item.account === accountName);
        
        // Group people by FLM
        const flmToPeople = {};
        
        accountData.forEach(item => {
            const flm = item.flm;
            const person = item.person;
            
            if (!flm || !person || flm === 'N/A') return;
            
            if (!flmToPeople[flm]) {
                flmToPeople[flm] = new Set();
            }
            
            flmToPeople[flm].add(person);
        });
        
        // Calculate quota for each FLM
        Object.keys(flmToPeople).forEach(flm => {
            const people = Array.from(flmToPeople[flm]);
            let totalQuota = 0;
            
            people.forEach(person => {
                // Get the person's quota
                const personQuota = this.personQuotas[person] || 0;
                
                // Get the number of accounts the person is assigned to
                const personAccounts = deploymentData
                    .filter(item => item.person === person)
                    .map(item => item.account)
                    .filter((value, index, self) => self.indexOf(value) === index); // Unique accounts
                
                // Calculate the quota allocation for this account
                const allocation = personAccounts.length > 0 ? 1.0 / personAccounts.length : 0;
                const allocatedQuota = personQuota * allocation;
                
                totalQuota += allocatedQuota;
            });
            
            flmQuotas[flm] = totalQuota;
        });
        
        console.log(`[LOG] Calculated quotas for ${Object.keys(flmQuotas).length} FLMs for account: ${accountName}`);
        
        return flmQuotas;
    },
    
    /**
     * Get quota breakdown by SLM for a specific account
     * @param {string} accountName - Account name
     * @param {Array} deploymentData - Array of deployment data objects
     * @returns {Object} Map of SLM names to quota values for the account
     */
    getQuotaBreakdownBySLMForAccount: function(accountName, deploymentData) {
        console.log(`[LOG] Getting quota breakdown by SLM for account: ${accountName}`);
        
        const slmQuotas = {};
        
        // Filter deployment data for the specified account
        const accountData = deploymentData.filter(item => item.account === accountName);
        
        // Group people by SLM
        const slmToPeople = {};
        
        accountData.forEach(item => {
            const slm = item.slm;
            const person = item.person;
            
            if (!slm || !person || slm === 'N/A') return;
            
            if (!slmToPeople[slm]) {
                slmToPeople[slm] = new Set();
            }
            
            slmToPeople[slm].add(person);
        });
        
        // Calculate quota for each SLM
        Object.keys(slmToPeople).forEach(slm => {
            const people = Array.from(slmToPeople[slm]);
            let totalQuota = 0;
            
            people.forEach(person => {
                // Get the person's quota
                const personQuota = this.personQuotas[person] || 0;
                
                // Get the number of accounts the person is assigned to
                const personAccounts = deploymentData
                    .filter(item => item.person === person)
                    .map(item => item.account)
                    .filter((value, index, self) => self.indexOf(value) === index); // Unique accounts
                
                // Calculate the quota allocation for this account
                const allocation = personAccounts.length > 0 ? 1.0 / personAccounts.length : 0;
                const allocatedQuota = personQuota * allocation;
                
                totalQuota += allocatedQuota;
            });
            
            slmQuotas[slm] = totalQuota;
        });
        
        console.log(`[LOG] Calculated quotas for ${Object.keys(slmQuotas).length} SLMs for account: ${accountName}`);
        
        return slmQuotas;
    },
    
    /**
     * Get quota breakdown by brand for a specific account
     * @param {string} accountName - Account name
     * @param {Array} deploymentData - Array of deployment data objects
     * @returns {Object} Map of brand names to quota values for the account
     */
    getQuotaBreakdownByBrandForAccount: function(accountName, deploymentData) {
        console.log(`[LOG] Getting quota breakdown by brand for account: ${accountName}`);
        
        const brandQuotas = {};
        
        // Filter deployment data for the specified account
        const accountData = deploymentData.filter(item => item.account === accountName);
        
        // Group people by brand
        const brandToPeople = {};
        
        accountData.forEach(item => {
            const brand = item.brand;
            const person = item.person;
            
            if (!brand || !person) return;
            
            if (!brandToPeople[brand]) {
                brandToPeople[brand] = new Set();
            }
            
            brandToPeople[brand].add(person);
        });
        
        // Calculate quota for each brand
        Object.keys(brandToPeople).forEach(brand => {
            const people = Array.from(brandToPeople[brand]);
            let totalQuota = 0;
            
            people.forEach(person => {
                // Get the person's quota
                const personQuota = this.personQuotas[person] || 0;
                
                // Get the number of accounts the person is assigned to
                const personAccounts = deploymentData
                    .filter(item => item.person === person)
                    .map(item => item.account)
                    .filter((value, index, self) => self.indexOf(value) === index); // Unique accounts
                
                // Calculate the quota allocation for this account
                const allocation = personAccounts.length > 0 ? 1.0 / personAccounts.length : 0;
                const allocatedQuota = personQuota * allocation;
                
                totalQuota += allocatedQuota;
            });
            
            brandQuotas[brand] = totalQuota;
        });
        
        console.log(`[LOG] Calculated quotas for ${Object.keys(brandQuotas).length} brands for account: ${accountName}`);
        
        return brandQuotas;
    },
    
    /**
     * Get quota breakdown by team for a specific account
     * @param {string} accountName - Account name
     * @param {Array} deploymentData - Array of deployment data objects
     * @returns {Object} Map of team names to quota values for the account
     */
    getQuotaBreakdownByTeamForAccount: function(accountName, deploymentData) {
        console.log(`[LOG] Getting quota breakdown by team for account: ${accountName}`);
        
        const teamQuotas = {};
        
        // Filter deployment data for the specified account
        const accountData = deploymentData.filter(item => item.account === accountName);
        
        // Group people by team
        const teamToPeople = {};
        
        // Add teams explicitly to ensure they're always present
        teamToPeople['CE'] = new Set();
        teamToPeople['BTS'] = new Set();
        teamToPeople['CSM'] = new Set();
        
        console.log(`[LOG] Found ${accountData.length} people for account: ${accountName}`);
        
        accountData.forEach(item => {
            // Determine the team based on personType, role, or other attributes
            let team = item.personType || ''; // CE, CSM
            
            // If no personType, try to determine from role or other attributes
            if (!team && item.role) {
                if (item.role.includes('BTS') || item.role.includes('Brand Technical Specialist')) {
                    team = 'BTS';
                } else if (item.role.includes('CE') || item.role.includes('Client Engineering')) {
                    team = 'CE';
                } else if (item.role.includes('CSM') || item.role.includes('Customer Success')) {
                    team = 'CSM';
                }
            }
            
            // If still no team, check if we can determine from the person's role in quota data
            if (!team && this.personToRole[item.person]) {
                const role = this.personToRole[item.person];
                if (role.includes('BTS') || role.includes('Brand Technical Specialist')) {
                    team = 'BTS';
                } else if (role.includes('CE') || role.includes('Client Engineering')) {
                    team = 'CE';
                } else if (role.includes('CSM') || role.includes('Customer Success')) {
                    team = 'CSM';
                }
            }
            
            // Special case: If brand is 'CE', set team to 'CE'
            if (item.brand === 'CE' || item.brand === 'Client Engineering') {
                team = 'CE';
                console.log(`[LOG] Setting team to CE based on brand for person: ${item.person} in account: ${accountName}`);
            }
            
            // Skip if no team or person
            if (!team || !item.person) {
                console.log(`[LOG] Skipping person: ${item.person} - no team assigned`);
                return;
            }
            
            if (!teamToPeople[team]) {
                teamToPeople[team] = new Set();
            }
            
            teamToPeople[team].add(item.person);
            console.log(`[LOG] Assigned person: ${item.person} to team: ${team}`);
        });
        
        // Calculate quota for each team
        Object.keys(teamToPeople).forEach(team => {
            const people = Array.from(teamToPeople[team]);
            let totalQuota = 0;
            
            console.log(`[LOG] Team ${team} has ${people.length} people assigned`);
            
            people.forEach(person => {
                // Get the person's quota
                const personQuota = this.personQuotas[person] || 0;
                
                // Get the number of accounts the person is assigned to
                const personAccounts = deploymentData
                    .filter(item => item.person === person)
                    .map(item => item.account)
                    .filter((value, index, self) => self.indexOf(value) === index); // Unique accounts
                
                // Calculate the quota allocation for this account
                const allocation = personAccounts.length > 0 ? 1.0 / personAccounts.length : 0;
                const allocatedQuota = personQuota * allocation;
                
                console.log(`[LOG] Person ${person} in team ${team} has quota ${personQuota} with allocation ${allocation} = ${allocatedQuota}`);
                
                totalQuota += allocatedQuota;
            });
            
            teamQuotas[team] = totalQuota;
            console.log(`[LOG] Total quota for team ${team}: ${totalQuota}`);
        });
        
        console.log(`[LOG] Calculated quotas for ${Object.keys(teamQuotas).length} teams for account: ${accountName}`);
        console.log(`[LOG] Final team quotas:`, teamQuotas);
        
        return teamQuotas;
    }
};
