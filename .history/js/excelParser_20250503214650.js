/**
 * Excel Parser for Account Deployment Dashboard
 * Handles parsing the Excel file with hierarchical structure (SLM -> FLM -> Employees)
 * Optimized version to prevent script timeouts
 */
const excelParser = {
    /**
     * Parse Excel file and extract hierarchical data
     * @param {File} file - Excel file to parse
     * @returns {Promise} Promise resolving to parsed data
     */
    parseExcelFile: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    console.time('Excel Parsing'); // Add timing for performance monitoring
                    
                    // Parse Excel data
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    this.logDebug(`Workbook loaded with ${workbook.SheetNames.length} sheets`);
                    this.logDebug(`Sheet names: ${workbook.SheetNames.join(', ')}`);
                    
                    // Process workbook data with optimized approach
                    const parsedData = this.processWorkbook(workbook);
                    
                    console.timeEnd('Excel Parsing'); // End timing
                    this.logDebug(`Total records extracted: ${parsedData.length}`);
                    
                    resolve(parsedData);
                } catch (error) {
                    this.logDebug(`Error parsing Excel file: ${error.message}`);
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    },
    
    /**
     * Process workbook and extract hierarchical data with optimized approach
     * @param {Object} workbook - XLSX workbook object
     * @returns {Array} Array of parsed data items
     */
    processWorkbook: function(workbook) {
        // Store all extracted data
        const allData = [];
        
        // Each sheet represents a "Brand"
        workbook.SheetNames.forEach((sheetName, sheetIndex) => {
            const brand = sheetName;
            this.logDebug(`Processing sheet ${sheetIndex + 1}/${workbook.SheetNames.length}: ${brand}`);
            
            // Get the worksheet
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to array format with headers
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (data.length < 3) {
                this.logDebug(`Not enough data in sheet ${brand}`);
                return;
            }
            
            // The first row contains header information
            const headerRow = data[0] || [];
            
            // Find SLM and FLM column indices - optimization: do this once per sheet
            const slmIndices = [];
            const flmIndices = [];
            const headerColumns = {}; // Store header column names by index for quick lookup
            
            headerRow.forEach((cell, index) => {
                if (cell && typeof cell === 'string') {
                    headerColumns[index] = cell;
                    if (cell.includes('SLM')) {
                        slmIndices.push(index);
                        this.logDebug(`Found SLM column at index ${index}: ${cell}`);
                    } else if (cell.includes('FLM')) {
                        flmIndices.push(index);
                        this.logDebug(`Found FLM column at index ${index}: ${cell}`);
                    }
                }
            });
            
            if (slmIndices.length === 0) {
                this.logDebug(`No SLM columns found in sheet ${brand}`);
                return;
            }
            
            this.logDebug(`Found ${slmIndices.length} SLM columns and ${flmIndices.length} FLM columns`);
            
            // Build hierarchy group mapping more efficiently
            const hierarchyGroups = this.buildHierarchyGroups(slmIndices, flmIndices, headerRow);
            
            // Process data rows (row 2 onwards, skipping the header row)
            // Add progress logging for better debugging and browser responsiveness
            const totalRows = data.length - 1;
            this.logDebug(`Processing ${totalRows} data rows`);
            
            // Process rows - report progress every 10 rows for large spreadsheets
            for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
                if (rowIdx % 10 === 0) {
                    this.logDebug(`Processing row ${rowIdx}/${data.length - 1} (${Math.round(rowIdx / (data.length - 1) * 100)}%)`);
                }
                
                const row = data[rowIdx];
                
                // Skip empty rows or rows without account name
                if (!row || !row[1]) continue;
                
                // Get account name and client type
                const account = row[1];
                const clientType = row[2] || '';
                
                // Process each hierarchy group with optimized code
                this.processRowHierarchies(row, hierarchyGroups, headerRow, account, clientType, brand, allData);
            }
        });
        
        return allData;
    },
    
    /**
     * Build hierarchy groups more efficiently
     * @param {Array} slmIndices - Indices of SLM columns
     * @param {Array} flmIndices - Indices of FLM columns
     * @param {Array} headerRow - Header row with column names
     * @returns {Array} Array of hierarchy group objects
     */
    buildHierarchyGroups: function(slmIndices, flmIndices, headerRow) {
        const hierarchyGroups = [];
        
        slmIndices.forEach((slmIndex, groupIdx) => {
            // Try to find FLM column that comes after this SLM column
            const nextSlmIndex = slmIndices.find(idx => idx > slmIndex) || Number.MAX_SAFE_INTEGER;
            const flmIndex = flmIndices.find(idx => idx > slmIndex && idx < nextSlmIndex);
            
            // Get category/group name from the cell before the SLM label or from column header
            const groupName = headerRow[slmIndex - 1] || `Group ${groupIdx + 1}`;
            
            // Find employee columns - all columns between FLM (or SLM if no FLM) and next SLM
            const startIndex = flmIndex ? flmIndex + 1 : slmIndex + 1;
            const employeeIndices = [];
            
            for (let i = startIndex; i < nextSlmIndex; i++) {
                // Skip if this is an FLM column
                if (flmIndices.includes(i)) continue;
                
                // Include if it has a header value
                if (headerRow[i]) {
                    employeeIndices.push(i);
                }
            }
            
            hierarchyGroups.push({
                name: groupName,
                slmIndex,
                flmIndex,
                employeeIndices
            });
            
            this.logDebug(`Hierarchy group "${groupName}": SLM=${slmIndex}, FLM=${flmIndex}, Employee columns=${employeeIndices.length}`);
        });
        
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
        hierarchyGroups.forEach(group => {
            const slm = row[group.slmIndex] || '';
            const flm = group.flmIndex ? row[group.flmIndex] || '' : '';
            
            // Skip if no management structure
            if (!slm && !flm) return;
            
            // Process each employee column - optimization: avoid unnecessary checks
            for (let i = 0; i < group.employeeIndices.length; i++) {
                const colIdx = group.employeeIndices[i];
                const employee = row[colIdx];
                
                // Skip empty cells or placeholders
                if (!employee || this.isPlaceholder(employee)) continue;
                
                // Get the role from the header row
                const role = headerRow[colIdx] || '';
                
                // Split multiple names if present and add each to the dataset
                const employeeNames = this.splitMultipleNames(employee);
                
                // Optimization: add all employees in one batch when possible
                employeeNames.forEach(name => {
                    allData.push({
                        account,
                        brand,
                        slm,
                        flm,
                        person: name,
                        role,
                        hierarchyName: group.name,
                        clientType
                    });
                });
            }
        });
    },
    
    /**
     * Check if a value is a placeholder rather than a person's name
     * @param {string} value - Cell value to check
     * @returns {boolean} True if the value is a placeholder
     */
    isPlaceholder: function(value) {
        if (typeof value !== 'string') return true;
        
        const placeholders = ['TBD', 'N/A', 'None', 'Select', '-', '--', '---'];
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
        if (!cleanValue) return [];
        
        // Check for comma or slash separated values
        if (cleanValue.includes(',')) {
            return cleanValue.split(',')
                .map(name => name.trim())
                .filter(name => name && !this.isPlaceholder(name));
        } else if (cleanValue.includes('/')) {
            return cleanValue.split('/')
                .map(name => name.trim())
                .filter(name => name && !this.isPlaceholder(name));
        }
        
        // Single name
        return [cleanValue];
    },
    
    /**
     * Log debug information if debug mode is enabled
     * @param {string} message - Debug message
     */
    logDebug: function(message) {
        if (config && config.debug) {
            console.log(`[ExcelParser] ${message}`);
            
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