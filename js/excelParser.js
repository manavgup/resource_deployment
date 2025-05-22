/**
 * Excel Parser for Account Deployment Dashboard
 * Handles parsing the Excel file with hierarchical structure (SLM -> FLM -> Employees)
 * Enhanced version to handle multiple worksheet types (Data, Automation, Infrastructure, CE, CSM, Quota)
 * Optimized to prevent script timeouts
 */
const excelParser = {
    /**
     * Parse Excel file and extract hierarchical data
     * @param {File} file - Excel file to parse
     * @returns {Promise} Promise resolving to parsed data
     */
    parseExcelFile: function(file) {
        console.log(`[LOG] Entering excelParser.parseExcelFile: ${file.name}`); // Added Log
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    console.time('Excel Parsing'); // Add timing for performance monitoring
                    console.log("[LOG] FileReader onload triggered, starting XLSX.read..."); // Added Log

                    // Parse Excel data
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    console.log("[LOG] XLSX.read finished."); // Added Log


                    this.logDebug(`Workbook loaded with ${workbook.SheetNames.length} sheets`);
                    this.logDebug(`Sheet names: ${workbook.SheetNames.join(', ')}`);

                    // Process workbook data with optimized approach
                    console.log("[LOG] Calling excelParser.processWorkbook..."); // Added Log
                    const parsedData = this.processWorkbook(workbook);
                    console.log("[LOG] excelParser.processWorkbook finished."); // Added Log


                    console.timeEnd('Excel Parsing'); // End timing
                    this.logDebug(`Total records extracted: ${parsedData.length}`);

                    console.log(`[LOG] Exiting excelParser.parseExcelFile (success). Resolving promise.`); // Added Log
                    resolve(parsedData);
                } catch (error) {
                    this.logDebug(`Error parsing Excel file: ${error.message}`);
                    console.error("[LOG] Error in excelParser.parseExcelFile:", error); // Added Log
                    console.log(`[LOG] Exiting excelParser.parseExcelFile (with error). Rejecting promise.`); // Added Log
                    reject(error);
                }
            };

            reader.onerror = (error) => { // Capture the error object
                 console.error("[LOG] FileReader onerror triggered:", error); // Added Log
                 console.log(`[LOG] Exiting excelParser.parseExcelFile (reader error). Rejecting promise.`); // Added Log
                reject(new Error('Failed to read file: ' + (error ? error.message : 'Unknown error'))); // Provide more info if available
            };

            console.log("[LOG] Calling FileReader.readAsArrayBuffer..."); // Added Log
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Process workbook and extract hierarchical data with optimized approach
     * @param {Object} workbook - XLSX workbook object
     * @returns {Array} Array of parsed data items
     */
    processWorkbook: function(workbook) {
        console.log("[LOG] Entering excelParser.processWorkbook"); // Added Log
        // Store all extracted data
        const allData = [];
        
        // Store CE and CSM data for cross-referencing
        const ceData = [];
        const csmData = [];

        // Process each sheet based on its type
        workbook.SheetNames.forEach((sheetName, sheetIndex) => {
            this.logDebug(`Processing sheet ${sheetIndex + 1}/${workbook.SheetNames.length}: ${sheetName}`);

            // Get the worksheet
            const worksheet = workbook.Sheets[sheetName];

            // Convert to array format with headers
            console.log(`[LOG] Converting sheet "${sheetName}" to JSON array...`); // Added Log
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            console.log(`[LOG] Sheet "${sheetName}" converted. Found ${data.length} rows.`); // Added Log

            if (data.length < 2) { // Changed from 3 to 2, as header + 1 data row is enough
                this.logDebug(`Not enough data in sheet ${sheetName} (less than 2 rows including header)`);
                return;
            }

            // The first row contains header information
            const headerRow = data[0] || [];
            console.log(`[LOG] Sheet "${sheetName}" header row has ${headerRow.length} columns.`); // Added Log

            // Determine sheet type based on name
            if (sheetName === 'CE') {
                this.processCESheet(data, headerRow, ceData);
            } else if (sheetName === 'CSM') {
                this.processCSMSheet(data, headerRow, csmData);
            } else if (sheetName === 'Quota') {
                this.processQuotaSheet(data, headerRow, allData);
            } else if (sheetName === 'QUOTA_PRI') { // Added case for QUOTA_PRI
                this.processQUOTAPRISheet(data, headerRow, allData); // Call new processing function
            } else {
                // Treat as a regular "Brand" sheet (Data, Automation, Infrastructure)
                this.processBrandSheet(sheetName, data, headerRow, allData);
            }
        });

        // Process relationships between CE/CSM data and account data
        this.processRelationships(allData, ceData, csmData);

        console.log("[LOG] Exiting excelParser.processWorkbook. Total records extracted:", allData.length); // Added Log
        return allData;
    },

    /**
     * Process a regular brand sheet (Data, Automation, Infrastructure)
     * @param {string} brand - Brand name (sheet name)
     * @param {Array} data - Sheet data as array
     * @param {Array} headerRow - Header row with column names
     * @param {Array} allData - Array to store extracted data
     */
    processBrandSheet: function(brand, data, headerRow, allData) {
        console.log(`[LOG] Processing brand sheet: ${brand}`);
        
        // Find SLM and FLM column indices - optimization: do this once per sheet
        const slmIndices = [];
        const flmIndices = [];
        const headerColumns = {}; // Store header column names by index for quick lookup

        console.log("[LOG] Identifying SLM and FLM columns..."); // Added Log
        headerRow.forEach((cell, index) => {
            if (cell && typeof cell === 'string') {
                headerColumns[index] = cell;
                if (cell.includes('SLM')) {
                    slmIndices.push(index);
                    this.logDebug(`Found SLM column at index ${index}: "${cell}"`);
                } else if (cell.includes('FLM')) {
                    flmIndices.push(index);
                    this.logDebug(`Found FLM column at index ${index}: "${cell}"`);
                }
            }
        });

        if (slmIndices.length === 0) {
            this.logDebug(`No SLM columns found in sheet ${brand}. Skipping sheet.`);
            return;
        }

        this.logDebug(`Found ${slmIndices.length} SLM columns and ${flmIndices.length} FLM columns`);

        // Build hierarchy group mapping more efficiently
        console.log("[LOG] Building hierarchy groups..."); // Added Log
        const hierarchyGroups = this.buildHierarchyGroups(slmIndices, flmIndices, headerRow);
        console.log(`[LOG] Built ${hierarchyGroups.length} hierarchy groups.`); // Added Log

        // Process data rows (row 2 onwards, skipping the header row)
        // Add progress logging for better debugging and browser responsiveness
        const totalDataRows = data.length - 1;
        this.logDebug(`Processing ${totalDataRows} data rows in sheet "${brand}"`);

        // Process rows - report progress every few rows for small sheets
        const logInterval = Math.max(1, Math.floor(totalDataRows / 10)); // Log at least once per 10% or once if less than 10 rows

        for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
            if (rowIdx % logInterval === 0 || rowIdx === 1 || rowIdx === data.length -1) { // Log start, interval, and end
                this.logDebug(`Processing row ${rowIdx}/${data.length - 1} (${Math.round(rowIdx / (data.length - 1) * 100)}%) in sheet "${brand}"`);
            }

            const row = data[rowIdx];

            // Skip empty rows or rows without account name (assuming Account is column index 1)
            if (!row || !row[1] || String(row[1]).trim() === '') { // Ensure row[1] exists and is not just whitespace
                if (rowIdx % logInterval === 0 || rowIdx === 1 || rowIdx === data.length -1) {
                    this.logDebug(`Skipping empty or account-less row ${rowIdx}`);
                }
                continue;
            }

            // Get account name and client type
            const account = String(row[1]).trim(); // Trim whitespace
            const clientType = row[2] ? String(row[2]).trim() : ''; // Trim whitespace or default to empty

            // Process each hierarchy group with optimized code
            this.processRowHierarchies(row, hierarchyGroups, headerRow, account, clientType, brand, allData);
        }
        this.logDebug(`Finished processing all data rows in sheet "${brand}".`); // Added Log
    },

    /**
     * Process CE (Customer Engineer) worksheet
     * @param {Array} data - Sheet data as array
     * @param {Array} headerRow - Header row with column names
     * @param {Array} ceData - Array to store CE data
     */
    processCESheet: function(data, headerRow, ceData) {
        console.log("[LOG] Processing CE sheet");
        
        // Find column indices for CE sheet
        const columnIndices = {};
        headerRow.forEach((cell, index) => {
            if (cell && typeof cell === 'string') {
                const cellName = cell.trim();
                if (cellName === 'Employee Name') columnIndices.employeeName = index;
                else if (cellName === 'FLM / SLM') columnIndices.flmSlm = index;
                else if (cellName === 'Title') columnIndices.title = index;
                else if (cellName === 'Coverage') columnIndices.coverage = index;
                else if (cellName === 'Manager') columnIndices.manager = index;
                else if (cellName === 'Level') columnIndices.level = index;
            }
        });
        
        this.logDebug(`CE sheet column indices: ${JSON.stringify(columnIndices)}`);
        
        // Process data rows (row 2 onwards, skipping the header row)
        for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
            const row = data[rowIdx];
            
            // Skip empty rows
            if (!row || !row[columnIndices.employeeName]) continue;
            
            const employeeName = String(row[columnIndices.employeeName] || '').trim();
            const flmSlm = String(row[columnIndices.flmSlm] || '').trim();
            const title = String(row[columnIndices.title] || '').trim();
            const coverage = String(row[columnIndices.coverage] || '').trim();
            const manager = String(row[columnIndices.manager] || '').trim();
            const level = String(row[columnIndices.level] || '').trim();
            
            // Skip if employee name is empty or a placeholder
            if (!employeeName || this.isPlaceholder(employeeName)) continue;
            
            // Determine if the person is an FLM or SLM
            const isFLM = flmSlm.includes('FLM');
            const isSLM = flmSlm.includes('SLM');
            
            ceData.push({
                person: employeeName,
                flmSlm: flmSlm,
                isFLM: isFLM,
                isSLM: isSLM,
                title: title,
                coverage: coverage,
                manager: manager,
                level: level,
                type: 'CE' // Mark as CE type
            });
        }
        
        this.logDebug(`Processed ${ceData.length} CE records`);
    },

    /**
     * Process CSM (Customer Success Manager) worksheet
     * @param {Array} data - Sheet data as array
     * @param {Array} headerRow - Header row with column names
     * @param {Array} csmData - Array to store CSM data
     */
    processCSMSheet: function(data, headerRow, csmData) {
        console.log("[LOG] Processing CSM sheet");
        
        // Find column indices for CSM sheet
        const columnIndices = {};
        headerRow.forEach((cell, index) => {
            if (cell && typeof cell === 'string') {
                const cellName = cell.trim();
                if (cellName === 'Employee Name') columnIndices.employeeName = index;
                else if (cellName === 'FLM / SLM') columnIndices.flmSlm = index;
                else if (cellName === 'Specialty') columnIndices.specialty = index;
                else if (cellName === 'Department/Team') columnIndices.department = index;
                else if (cellName === 'Manager') columnIndices.manager = index;
                else if (cellName === 'Level') columnIndices.level = index;
            }
        });
        
        this.logDebug(`CSM sheet column indices: ${JSON.stringify(columnIndices)}`);
        
        // Process data rows (row 2 onwards, skipping the header row)
        for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
            const row = data[rowIdx];
            
            // Skip empty rows
            if (!row || !row[columnIndices.employeeName]) continue;
            
            const employeeName = String(row[columnIndices.employeeName] || '').trim();
            const flmSlm = String(row[columnIndices.flmSlm] || '').trim();
            const specialty = String(row[columnIndices.specialty] || '').trim();
            const department = String(row[columnIndices.department] || '').trim();
            const manager = String(row[columnIndices.manager] || '').trim();
            const level = String(row[columnIndices.level] || '').trim();
            
            // Skip if employee name is empty or a placeholder
            if (!employeeName || this.isPlaceholder(employeeName)) continue;
            
            // Determine if the person is an FLM or SLM
            const isFLM = flmSlm.includes('FLM');
            const isSLM = flmSlm.includes('SLM');
            
            csmData.push({
                person: employeeName,
                flmSlm: flmSlm,
                isFLM: isFLM,
                isSLM: isSLM,
                specialty: specialty,
                department: department,
                manager: manager,
                level: level,
                type: 'CSM' // Mark as CSM type
            });
        }
        
        this.logDebug(`Processed ${csmData.length} CSM records`);
    },

    /**
     * Process Quota worksheet
     * @param {Array} data - Sheet data as array
     * @param {Array} headerRow - Header row with column names
     * @param {Array} allData - Array to store extracted data
     */
    processQuotaSheet: function(data, headerRow, allData) {
        console.log("[LOG] Processing Quota sheet");
        
        // Find column indices for Quota sheet
        const columnIndices = {};
        headerRow.forEach((cell, index) => {
            if (cell && typeof cell === 'string') {
                const cellName = cell.trim().toLowerCase();
                if (cellName === 'seller talent id') columnIndices.sellerTalentId = index;
                else if (cellName === 'seller name') columnIndices.sellerName = index;
                else if (cellName === 'total') columnIndices.total = index;
                else if (cellName === 'band') columnIndices.band = index;
                else if (cellName === 'role') columnIndices.role = index;
                else if (cellName === 'platform') columnIndices.platform = index;
                else if (cellName === 'manager') columnIndices.manager = index;
                else if (cellName === 'manager flag') columnIndices.managerFlag = index;
                else if (cellName === 'tqp/iqp') columnIndices.tqpIqp = index;
            }
        });
        
        this.logDebug(`Quota sheet column indices: ${JSON.stringify(columnIndices)}`);
        
        // Check if we found the required columns
        if (!columnIndices.sellerName || !columnIndices.total) {
            this.logDebug("Required columns not found in Quota sheet. Skipping.");
            return;
        }
        
        // Process data rows (row 2 onwards, skipping the header row)
        const quotaData = [];
        
        for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
            const row = data[rowIdx];
            
            // Skip empty rows
            if (!row || !row[columnIndices.sellerName]) continue;
            
            const sellerTalentId = columnIndices.sellerTalentId !== undefined ? String(row[columnIndices.sellerTalentId] || '') : '';
            const sellerName = String(row[columnIndices.sellerName] || '').trim();
            const total = columnIndices.total !== undefined ? row[columnIndices.total] : 0;
            const band = columnIndices.band !== undefined ? String(row[columnIndices.band] || '') : '';
            const role = columnIndices.role !== undefined ? String(row[columnIndices.role] || '') : '';
            const platform = columnIndices.platform !== undefined ? String(row[columnIndices.platform] || '') : '';
            const manager = columnIndices.manager !== undefined ? String(row[columnIndices.manager] || '') : '';
            const managerFlag = columnIndices.managerFlag !== undefined ? String(row[columnIndices.managerFlag] || '') : '';
            const tqpIqp = columnIndices.tqpIqp !== undefined ? String(row[columnIndices.tqpIqp] || '') : '';
            
            // Skip if seller name is empty or a placeholder
            if (!sellerName || this.isPlaceholder(sellerName)) continue;
            
            // Create quota data object
            const quotaItem = {
                sellerTalentId,
                sellerName,
                total,
                band,
                role,
                platform,
                manager,
                managerFlag,
                tqpIqp
            };
            
            // Add to quota data array
            quotaData.push(quotaItem);
        }
        
        this.logDebug(`Processed ${quotaData.length} quota records`);
        
        // Store quota data in allData with a special type
        if (quotaData.length > 0) {
            // Store the quota data separately for later processing
            if (!allData.quotaData) {
                allData.quotaData = quotaData;
            } else {
                allData.quotaData = allData.quotaData.concat(quotaData);
            }
        }
    },

    /**
     * Process QUOTA_PRI worksheet
     * @param {Array} data - Sheet data as array
     * @param {Array} headerRow - Header row with column names
     * @param {Array} allData - Array to store extracted data
     */
    processQUOTAPRISheet: function(data, headerRow, allData) {
        console.log("[LOG] Processing QUOTA_PRI sheet");
        
        // Find column indices for QUOTA_PRI sheet
        const columnIndices = {};
        headerRow.forEach((cell, index) => {
            if (cell && typeof cell === 'string') {
                const cellName = cell.trim();
                if (cellName === 'Seller Talent ID') columnIndices.sellerTalentId = index;
                else if (cellName === 'Seller Name') columnIndices.sellerName = index;
                else if (cellName === 'Mgr Name') columnIndices.managerName = index; // New column
                else if (cellName === 'Manager Talent ID') columnIndices.managerTalentId = index; // New column
                else if (cellName === 'Target/Quota Amt') columnIndices.targetQuotaAmt = index; // New column
                else if (cellName === 'Territory Type Name') columnIndices.territoryTypeName = index; // New column
                else if (cellName === 'Org Code') columnIndices.orgCode = index; // New column
                // Add other columns if needed for future use, but focus on required ones for now
            }
        });
        
        this.logDebug(`QUOTA_PRI sheet column indices: ${JSON.stringify(columnIndices)}`);
        
        // Check if we found the required columns
        if (!columnIndices.sellerName || !columnIndices.targetQuotaAmt || !columnIndices.territoryTypeName || !columnIndices.orgCode) {
            this.logDebug("Required columns not found in QUOTA_PRI sheet. Skipping.");
            return;
        }
        
        // Process data rows (row 2 onwards, skipping the header row)
        const quotaData = [];
        
        for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
            const row = data[rowIdx];
            
            // Skip empty rows or rows without a seller name or quota amount
            if (!row || !row[columnIndices.sellerName] || !row[columnIndices.targetQuotaAmt]) continue;
            
            const sellerTalentId = columnIndices.sellerTalentId !== undefined ? String(row[columnIndices.sellerTalentId] || '') : '';
            const sellerName = String(row[columnIndices.sellerName] || '').trim();
            const managerName = columnIndices.managerName !== undefined ? String(row[columnIndices.managerName] || '').trim() : '';
            const managerTalentId = columnIndices.managerTalentId !== undefined ? String(row[columnIndices.managerTalentId] || '') : '';
            const targetQuotaAmt = columnIndices.targetQuotaAmt !== undefined ? parseFloat(row[columnIndices.targetQuotaAmt]) || 0 : 0;
            const territoryTypeName = columnIndices.territoryTypeName !== undefined ? String(row[columnIndices.territoryTypeName] || '').trim() : '';
            const orgCode = columnIndices.orgCode !== undefined ? String(row[columnIndices.orgCode] || '').trim() : '';
            
            // Skip if seller name is empty or a placeholder
            if (!sellerName || this.isPlaceholder(sellerName)) continue;
            
            // Create quota data object
            const quotaItem = {
                sellerTalentId,
                sellerName,
                managerName,
                managerTalentId,
                targetQuotaAmt,
                territoryTypeName,
                orgCode
            };
            
            // Add to quota data array
            quotaData.push(quotaItem);
        }
        
        this.logDebug(`Processed ${quotaData.length} QUOTA_PRI records`);
        
        // Store quota data in allData with a special type
        if (quotaData.length > 0) {
            // Store the quota data separately for later processing
            if (!allData.quotaData) {
                allData.quotaData = quotaData;
            } else {
                allData.quotaData = allData.quotaData.concat(quotaData);
            }
        }
    },

    /**
     * Process relationships between CE/CSM data and account data
     * @param {Array} allData - Array of all data records
     * @param {Array} ceData - Array of CE data records
     * @param {Array} csmData - Array of CSM data records
     */
    processRelationships: function(allData, ceData, csmData) {
        console.log("[LOG] Processing relationships between CE/CSM data and accounts");
        
        // Create a map of SLM/FLM names to accounts
        const slmToAccounts = {};
        const flmToAccounts = {};
        
        // First pass: build the mapping of SLM/FLM to accounts
        allData.forEach(item => {
            if (item.slm && item.slm !== 'N/A') {
                if (!slmToAccounts[item.slm]) slmToAccounts[item.slm] = new Set();
                slmToAccounts[item.slm].add(item.account);
            }
            
            if (item.flm && item.flm !== 'N/A') {
                if (!flmToAccounts[item.flm]) flmToAccounts[item.flm] = new Set();
                flmToAccounts[item.flm].add(item.account);
            }
        });
        
        // Process CE data and add to allData
        ceData.forEach(ce => {
            let accounts = new Set();
            
            // If CE is an SLM, find accounts they manage
            if (ce.isSLM && slmToAccounts[ce.person]) {
                accounts = new Set([...accounts, ...slmToAccounts[ce.person]]);
            }
            
            // If CE is an FLM, find accounts they manage
            if (ce.isFLM && flmToAccounts[ce.person]) {
                accounts = new Set([...accounts, ...flmToAccounts[ce.person]]);
            }
            
            // If no accounts found but we have coverage information, use that
            if (accounts.size === 0 && ce.coverage) {
                // Coverage might list multiple accounts separated by commas
                const coverageAccounts = ce.coverage.split(',').map(a => a.trim());
                coverageAccounts.forEach(account => {
                    if (account && !this.isPlaceholder(account)) accounts.add(account);
                });
            }
            
            // Add CE to allData for each account they cover
            accounts.forEach(account => {
                allData.push({
                    account: account,
                    brand: 'CE', // Use CE as the brand
                    slm: ce.isSLM ? ce.person : (ce.manager || 'N/A'),
                    flm: ce.isFLM ? ce.person : 'N/A',
                    person: ce.person,
                    role: ce.title || 'CE',
                    hierarchyName: 'Customer Engineering',
                    clientType: '',
                    specialty: ce.specialty || '',
                    level: ce.level || '',
                    personType: 'CE' // Add person type
                });
            });
            
            // If no accounts found, still add the CE with a generic account
            if (accounts.size === 0) {
                allData.push({
                    account: 'Unassigned',
                    brand: 'CE',
                    slm: ce.isSLM ? ce.person : (ce.manager || 'N/A'),
                    flm: ce.isFLM ? ce.person : 'N/A',
                    person: ce.person,
                    role: ce.title || 'CE',
                    hierarchyName: 'Customer Engineering',
                    clientType: '',
                    specialty: ce.specialty || '',
                    level: ce.level || '',
                    personType: 'CE'
                });
            }
        });
        
        // Process CSM data and add to allData
        csmData.forEach(csm => {
            let accounts = new Set();
            
            // If CSM is an SLM, find accounts they manage
            if (csm.isSLM && slmToAccounts[csm.person]) {
                accounts = new Set([...accounts, ...slmToAccounts[csm.person]]);
            }
            
            // If CSM is an FLM, find accounts they manage
            if (csm.isFLM && flmToAccounts[csm.person]) {
                accounts = new Set([...accounts, ...flmToAccounts[csm.person]]);
            }
            
            // Add CSM to allData for each account they cover
            accounts.forEach(account => {
                allData.push({
                    account: account,
                    brand: 'CSM', // Use CSM as the brand
                    slm: csm.isSLM ? csm.person : (csm.manager || 'N/A'),
                    flm: csm.isFLM ? csm.person : 'N/A',
                    person: csm.person,
                    role: csm.specialty || 'CSM',
                    hierarchyName: csm.department || 'Customer Success',
                    clientType: '',
                    specialty: csm.specialty || '',
                    level: csm.level || '',
                    personType: 'CSM' // Add person type
                });
            });
            
            // If no accounts found, still add the CSM with a generic account
            if (accounts.size === 0) {
                allData.push({
                    account: 'Unassigned',
                    brand: 'CSM',
                    slm: csm.isSLM ? csm.person : (csm.manager || 'N/A'),
                    flm: csm.isFLM ? csm.person : 'N/A',
                    person: csm.person,
                    role: csm.specialty || 'CSM',
                    hierarchyName: csm.department || 'Customer Success',
                    clientType: '',
                    specialty: csm.specialty || '',
                    level: csm.level || '',
                    personType: 'CSM'
                });
            }
        });
        
        this.logDebug(`Added ${ceData.length} CE records and ${csmData.length} CSM records to allData`);
    },

    /**
     * Build hierarchy groups more efficiently
     * @param {Array} slmIndices - Indices of SLM columns
     * @param {Array} flmIndices - Indices of FLM columns
     * @param {Array} headerRow - Header row with column names
     * @returns {Array} Array of hierarchy group objects
     */
    buildHierarchyGroups: function(slmIndices, flmIndices, headerRow) {
        console.log("[LOG] Entering excelParser.buildHierarchyGroups"); // Added Log
        const hierarchyGroups = [];
        const totalColumns = headerRow.length; // Get the total number of columns

        slmIndices.forEach((slmIndex, groupIdx) => {
            // Try to find the next SLM column index to define the end of the current group
            // The group ends either at the next SLM or at the total number of columns
            const nextSlmIndex = slmIndices.find(idx => idx > slmIndex) || totalColumns; // Use totalColumns as the end boundary

            // Find the FLM column index that falls between the current SLM and the next SLM (or total columns)
            const flmIndex = flmIndices.find(idx => idx > slmIndex && idx < nextSlmIndex);

            // Get category/group name from the cell before the SLM label or from column header
            // Attempt to get a meaningful name, default to "Group X"
            const groupNameCandidate = headerRow[slmIndex - 1] || headerRow[slmIndex]; // Check cell before or the SLM cell itself
            const groupName = (groupNameCandidate && typeof groupNameCandidate === 'string' && groupNameCandidate.trim() !== '')
                              ? groupNameCandidate.trim()
                              : `Group ${groupIdx + 1}`;


            // Find employee columns - all columns between FLM (or SLM if no FLM) and next boundary
            const startIndex = flmIndex !== undefined ? flmIndex + 1 : slmIndex + 1; // Use strict inequality check
            const employeeIndices = [];

            // Corrected loop condition: loop up to the next SLM index or the total number of columns
            for (let i = startIndex; i < nextSlmIndex; i++) {
                // Ensure index is within bounds (safety check, should be covered by loop condition)
                if (i >= totalColumns) continue;


                // Skip if this column index is an FLM column index found in flmIndices
                if (flmIndices.includes(i)) continue;

                // Include if it has a header value and is not likely another manager column
                // We should check if the header contains 'SLM' or 'FLM' to exclude them
                const columnHeader = headerRow[i];
                 if (columnHeader && typeof columnHeader === 'string' && columnHeader.trim() !== '' &&
                     !columnHeader.includes('SLM') && !columnHeader.includes('FLM')) {
                    employeeIndices.push(i);
                }
            }

            hierarchyGroups.push({
                name: groupName,
                slmIndex,
                flmIndex, // Store the found FLM index (can be undefined)
                employeeIndices
            });

            this.logDebug(`Hierarchy group "${groupName}": SLM_Index=${slmIndex}, FLM_Index=${flmIndex !== undefined ? flmIndex : 'N/A'}, Employee columns count=${employeeIndices.length}`); // Improved log

        });
        console.log("[LOG] Exiting excelParser.buildHierarchyGroups"); // Added Log
        return hierarchyGroups;
    },


    /**
     * Process hierarchies in a row more efficiently
     * @param {Array} row - Data row
     * @param {Array} hierarchyGroups - Hierarchy group definitions
     * @param {Array} headerRow - Header row with column names
     * @param {string} account - Account name
     * @param {string} clientType - Client type
     * @param {string} brand - Brand name (sheet name)
     * @param {Array} allData - Array to store extracted data
     */
    processRowHierarchies: function(row, hierarchyGroups, headerRow, account, clientType, brand, allData) {
        // console.log(`[LOG] Entering excelParser.processRowHierarchies for account: ${account}`); // Removed verbose log

        hierarchyGroups.forEach(group => {
            // Get SLM and FLM names, trimming whitespace
            const slm = row[group.slmIndex] ? String(row[group.slmIndex]).trim() : '';
            // Check if flmIndex exists before accessing row[group.flmIndex]
            const flm = (group.flmIndex !== undefined && row[group.flmIndex]) ? String(row[group.flmIndex]).trim() : '';

            // Skip if no SLM and no FLM found for this hierarchy group in this row
            if (slm === '' && flm === '') return;

            // Process each employee column - optimization: avoid unnecessary checks
            for (let i = 0; i < group.employeeIndices.length; i++) {
                const colIdx = group.employeeIndices[i];
                const employeeCellContent = row[colIdx];

                // Skip empty cells or placeholders after trimming
                if (!employeeCellContent || typeof employeeCellContent !== 'string' || employeeCellContent.trim() === '' || this.isPlaceholder(employeeCellContent)) {
                    continue;
                }

                // Get the role from the header row, trim whitespace
                const role = headerRow[colIdx] ? String(headerRow[colIdx]).trim() : '';

                // Split multiple names if present and add each to the dataset
                const employeeNames = this.splitMultipleNames(employeeCellContent);

                // Add each extracted employee name to the dataset
                employeeNames.forEach(name => {
                    allData.push({
                        account,
                        brand,
                        slm: slm || 'N/A', // Use 'N/A' if SLM is empty
                        flm: flm || 'N/A', // Use 'N/A' if FLM is empty
                        person: name,
                        role: role || 'Personnel', // Use 'Personnel' if role header is empty
                        hierarchyName: group.name, // The name of the management group (e.g., "Data BTS")
                        clientType
                    });
                });
            }
        });
        // console.log("[LOG] Exiting excelParser.processRowHierarchies"); // Removed verbose log
    },


    /**
     * Check if a value is a placeholder rather than a person's name
     * @param {string} value - Cell value to check
     * @returns {boolean} True if the value is a placeholder
     */
    isPlaceholder: function(value) {
        if (typeof value !== 'string') return true;

        const placeholders = ['TBD', 'N/A', 'None', 'Select', '-', '--', '---', '']; // Added empty string
        const lowerValue = value.trim().toLowerCase();

        return placeholders.some(p => lowerValue === p.toLowerCase());
    },

    /**
     * Split a cell containing multiple names into individual names
     * @param {string} value - Cell value that might contain multiple names
     * @returns {Array} Array of individual names
     */
    splitMultipleNames: function(value) {
        if (typeof value !== 'string') return [];

        // Clean up the value
        const cleanValue = value.trim();
        if (!cleanValue || this.isPlaceholder(cleanValue)) return []; // Check placeholders after trimming

        let names = [];
        if (cleanValue.includes(',')) {
            names = cleanValue.split(',');
        } else if (cleanValue.includes('/')) {
            names = cleanValue.split('/');
        } else {
            // Single name
            names = [cleanValue];
        }

        // Trim each name and filter out empty or placeholder names
        return names.map(name => name.trim())
            .filter(name => name && !this.isPlaceholder(name)); // Filter out empty strings and placeholders

    },

    /**
     * Log debug information if debug mode is enabled
     * @param {string} message - Debug message
     */
    logDebug: function(message) {
        if (config && config.debug) {
            console.log(`[ExcelParser Debug] ${message}`); // Modified prefix

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
    }
};
