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
            
            // Convert to JSON with header: 'A' (use A, B, C as headers)
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 'A', raw: true });
            
            this.logDebug(`Rows in sheet: ${rawData.length}`);
            
            if (rawData.length > 2) {
                // Extract the header rows for debugging
                const categoryRow = rawData[0];
                const headerRow = rawData[1];
                
                this.logDebug(`Header row keys: ${Object.keys(headerRow).join(', ')}`);
                this.logDebug(`Header row values: ${Object.values(headerRow).filter(v => v).join(', ')}`);
                
                // Process the data directly since hierarchical detection is not working
                this.processDirectData(brand, rawData, allData);
            }
        });
        
        this.logDebug(`Total records extracted: ${allData.length}`);
        
        return allData;
    },
    
    /**
     * Process data directly without relying on hierarchy detection
     * @param {string} brand - Brand name (sheet name)
     * @param {Array} rawData - Raw data from Excel sheet
     * @param {Array} allData - Array to store processed data
     */
    processDirectData: function(brand, rawData, allData) {
        if (rawData.length < 3) {
            this.logDebug(`Not enough data in sheet ${brand}`);
            return;
        }
        
        // Extract the header information from first two rows
        const categoryRow = rawData[0]; // First row contains categories
        const headerRow = rawData[1];   // Second row contains role names
        
        // Find columns of interest based on the header row
        const slmCols = [];
        const flmCols = [];
        const employeeColsByGroup = {}; // Map SLM/FLM pairs to employee columns
        
        // First, identify SLM and FLM columns
        Object.entries(headerRow).forEach(([col, value]) => {
            if (typeof value === 'string' && value.includes('SLM')) {
                slmCols.push(col);
                employeeColsByGroup[col] = {
                    flmCol: null,
                    employeeCols: []
                };
            } else if (typeof value === 'string' && value.includes('FLM')) {
                flmCols.push(col);
                
                // Find the closest preceding SLM column
                let closestSLM = null;
                for (const slmCol of slmCols) {
                    if (this.compareColumns(slmCol, col) < 0) { // slmCol comes before col
                        if (!closestSLM || this.compareColumns(closestSLM, slmCol) < 0) {
                            closestSLM = slmCol;
                        }
                    }
                }
                
                if (closestSLM) {
                    employeeColsByGroup[closestSLM].flmCol = col;
                }
            }
        });
        
        // Now identify employee columns for each SLM-FLM pair
        const colOrder = Object.keys(headerRow).sort(this.compareColumns);
        
        slmCols.forEach(slmCol => {
            const group = employeeColsByGroup[slmCol];
            if (!group.flmCol) return; // Skip if no FLM found for this SLM
            
            const flmIndex = colOrder.indexOf(group.flmCol);
            const nextSlmIndex = colOrder.findIndex((col, idx) => 
                idx > flmIndex && slmCols.includes(col)
            );
            
            const endIndex = nextSlmIndex === -1 ? colOrder.length : nextSlmIndex;
            
            // Employee columns are between the FLM column and the next SLM column (or end)
            for (let i = flmIndex + 1; i < endIndex; i++) {
                group.employeeCols.push(colOrder[i]);
            }
            
            // Debug info for this group
            const categoryName = categoryRow[slmCol] || "Unnamed Category";
            this.logDebug(`Found group: ${categoryName} - SLM(${slmCol}), FLM(${group.flmCol}), Employees: ${group.employeeCols.length} columns`);
        });
        
        // Now process the data rows (row 3 onwards)
        for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i];
            
            // Skip empty rows
            if (!row.B) continue;
            
            // Get account name and client type
            const account = row.B;
            const clientType = row.C || '';
            
            // Process each SLM group
            slmCols.forEach(slmCol => {
                const group = employeeColsByGroup[slmCol];
                if (!group.flmCol) return; // Skip if no FLM for this SLM
                
                const slm = row[slmCol] || '';
                const flm = row[group.flmCol] || '';
                const groupName = categoryRow[slmCol] || "Unnamed";
                
                // Skip if no management structure
                if (!slm && !flm) return;
                
                // Process each employee column
                group.employeeCols.forEach(col => {
                    const employee = row[col];
                    if (!employee || this.isPlaceholder(employee)) return;
                    
                    // Get the role from the header
                    const role = headerRow[col] || '';
                    
                    // Split multiple names if present
                    const employeeNames = this.splitMultipleNames(employee);
                    
                    // Add each employee to the dataset
                    employeeNames.forEach(person => {
                        allData.push({
                            account,
                            brand,
                            slm,
                            flm,
                            person,
                            role,
                            hierarchyName: groupName,
                            clientType
                        });
                    });
                });
            });
        }
    },
    
    /**
     * Compare two Excel column letters (e.g., 'A', 'Z', 'AA')
     * @param {string} colA - First column
     * @param {string} colB - Second column
     * @returns {number} -1 if colA < colB, 0 if equal, 1 if colA > colB
     */
    compareColumns: function(colA, colB) {
        // Convert column letters to numbers
        const valueA = this.columnToNumber(colA);
        const valueB = this.columnToNumber(colB);
        
        return valueA - valueB;
    },
    
    /**
     * Convert Excel column letter to number (e.g., 'A' -> 1, 'Z' -> 26, 'AA' -> 27)
     * @param {string} col - Excel column letter
     * @returns {number} Column number
     */
    columnToNumber: function(col) {
        let result = 0;
        for (let i = 0; i < col.length; i++) {
            result = result * 26 + (col.charCodeAt(i) - 64); // 'A' is 65 in ASCII
        }
        return result;
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