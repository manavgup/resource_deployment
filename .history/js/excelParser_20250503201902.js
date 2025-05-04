/**
 * Excel Parser for Account Deployment Dashboard
 * Handles parsing the Excel file with hierarchical structure (SLM -> FLM -> Employees)
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
                    // Parse Excel data
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    this.logDebug(`Workbook loaded with ${workbook.SheetNames.length} sheets`);
                    this.logDebug(`Sheet names: ${workbook.SheetNames.join(', ')}`);
                    
                    // Process workbook data
                    const parsedData = this.processWorkbook(workbook);
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
     * Process workbook and extract hierarchical data
     * @param {Object} workbook - XLSX workbook object
     * @returns {Array} Array of parsed data items
     */
    processWorkbook: function(workbook) {
        // Store all extracted data
        const allData = [];
        
        // Each sheet represents a "Brand"
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const brand = sheetName;
            
            this.logDebug(`Processing sheet: ${brand}`);
            
            // Convert to JSON with header: 1 (use first row as headers)
            // We'll re-process this data to handle the hierarchical structure
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 'A', raw: true });
            
            // Process the hierarchical structure
            this.processHierarchicalData(brand, rawData, allData);
        });
        
        this.logDebug(`Total records extracted: ${allData.length}`);
        
        return allData;
    },
    
    /**
     * Process hierarchical data structure (SLM -> FLM -> Employees)
     * @param {string} brand - Brand name (sheet name)
     * @param {Array} rawData - Raw data from Excel sheet
     * @param {Array} allData - Array to store processed data
     */
    processHierarchicalData: function(brand, rawData, allData) {
        if (rawData.length < 3) {
            this.logDebug(`Not enough data in sheet ${brand}`);
            return;
        }
        
        // Extract the hierarchy structure from first two rows
        const headerRow = rawData[1]; // Second row contains role names
        const categoryRow = rawData[0]; // First row contains categories

        this.logDebug(`Header row keys: ${Object.keys(headerRow).join(', ')}`);
    this.logDebug(`Header row values: ${Object.values(headerRow).filter(v => v).join(', ')}`);
    this.logDebug(`Found hierarchies: ${Object.keys(hierarchyMap).length}`);
            
        // Find SLM and FLM columns - these form the management hierarchy
        const hierarchyMap = this.identifyHierarchy(brand, headerRow, categoryRow);
        
        // Process each row of actual data (starting from row 3)
        for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i];
            
            // Skip empty rows
            if (!row.B) continue;
            
            // Get account name and client type
            const account = row.B;
            const clientType = row.C || '';
            
            // Process each hierarchy identified
            Object.entries(hierarchyMap).forEach(([hierarchyName, columns]) => {
                // Get SLM and FLM from this hierarchy
                const slmCol = columns.slmCol;
                const flmCol = columns.flmCol;
                const employeeCols = columns.employeeCols;
                
                // Get manager names
                const slm = row[slmCol] || '';
                const flm = row[flmCol] || '';
                
                // Skip if no management structure
                if (!slm && !flm) return;
                
                // Process each employee column
                employeeCols.forEach(col => {
                    const employee = row[col];
                    
                    // Skip empty cells or non-person placeholders
                    if (!employee || this.isPlaceholder(employee)) return;
                    
                    // Find the role name from the header
                    const role = headerRow[col] || '';
                    
                    // Extract all employee names (might be comma or slash separated)
                    const employeeNames = this.splitMultipleNames(employee);
                    
                    // Add each employee to the dataset
                    employeeNames.forEach(name => {
                        allData.push({
                            account,
                            brand,
                            slm,
                            flm,
                            person: name,
                            role,
                            hierarchyName,
                            clientType
                        });
                    });
                });
            });
        }
    },
    
    /**
     * Identify hierarchical structure in a sheet
     * @param {string} brand - Brand name
     * @param {Object} headerRow - Row containing column headers
     * @param {Object} categoryRow - Row containing categories
     * @returns {Object} Map of hierarchy names to column indices
     */
    identifyHierarchy: function(brand, headerRow, categoryRow) {
        const hierarchyMap = {};
        
        // Look for SLM (Second Line Manager) in headers
        Object.entries(headerRow).forEach(([col, value]) => {
            if (value === 'SLM') {
                // Found an SLM column - this starts a hierarchy
                const hierarchyName = categoryRow[col] || `Hierarchy ${Object.keys(hierarchyMap).length + 1}`;
                
                // Find the FLM that corresponds to this SLM
                // Usually the FLM column is immediately after the SLM column
                const nextCol = this.getNextColumn(col);
                const flmCol = headerRow[nextCol] === 'FLM' ? nextCol : null;
                
                // If we found both SLM and FLM, we've identified a hierarchy
                if (flmCol) {
                    // Find employee columns - these are all columns between this FLM and the next SLM
                    const employeeCols = [];
                    let currentCol = this.getNextColumn(flmCol);
                    
                    // Keep going until we find the next SLM or run out of columns
                    while (currentCol && headerRow[currentCol] !== 'SLM') {
                        employeeCols.push(currentCol);
                        currentCol = this.getNextColumn(currentCol);
                    }
                    
                    hierarchyMap[hierarchyName] = {
                        slmCol: col,
                        flmCol,
                        employeeCols
                    };
                    
                    this.logDebug(`Found hierarchy: ${hierarchyName} - SLM(${col}), FLM(${flmCol}), Employees(${employeeCols.length} columns)`);
                }
            }
        });
        
        return hierarchyMap;
    },
    
    /**
     * Get the next column in Excel notation
     * @param {string} col - Current column (e.g., 'A', 'Z', 'AA')
     * @returns {string} Next column
     */
    getNextColumn: function(col) {
        if (col.length === 1) {
            // Single character column
            if (col === 'Z') return 'AA';
            return String.fromCharCode(col.charCodeAt(0) + 1);
        } else if (col.length === 2) {
            // Two character column
            const firstChar = col[0];
            const secondChar = col[1];
            
            if (secondChar === 'Z') {
                // Roll over to next first character
                return String.fromCharCode(firstChar.charCodeAt(0) + 1) + 'A';
            } else {
                // Increment second character
                return firstChar + String.fromCharCode(secondChar.charCodeAt(0) + 1);
            }
        }
        
        // For simplicity, not handling columns beyond 'ZZ'
        return null;
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
        if (config.debug) {
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