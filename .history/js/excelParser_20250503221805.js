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

        // Each sheet represents a "Brand"
        workbook.SheetNames.forEach((sheetName, sheetIndex) => {
            const brand = sheetName;
            this.logDebug(`Processing sheet ${sheetIndex + 1}/${workbook.SheetNames.length}: ${brand}`);

            // Get the worksheet
            const worksheet = workbook.Sheets[sheetName];

            // Convert to array format with headers
            console.log(`[LOG] Converting sheet "${brand}" to JSON array...`); // Added Log
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            console.log(`[LOG] Sheet "${brand}" converted. Found ${data.length} rows.`); // Added Log


            if (data.length < 2) { // Changed from 3 to 2, as header + 1 data row is enough
                this.logDebug(`Not enough data in sheet ${brand} (less than 2 rows including header)`);
                return;
            }

            // The first row contains header information
            const headerRow = data[0] || [];
            console.log(`[LOG] Sheet "${brand}" header row has ${headerRow.length} columns.`); // Added Log


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
                // Removed console.log here to avoid excessive logging per row
                this.processRowHierarchies(row, hierarchyGroups, headerRow, account, clientType, brand, allData);
            }
             this.logDebug(`Finished processing all data rows in sheet "${brand}".`); // Added Log
        });

        console.log("[LOG] Exiting excelParser.processWorkbook. Total records extracted:", allData.length); // Added Log
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
        console.log("[LOG] Entering excelParser.buildHierarchyGroups"); // Added Log
        const hierarchyGroups = [];

        slmIndices.forEach((slmIndex, groupIdx) => {
            // Try to find the next SLM column index to define the end of the current group
            const nextSlmIndex = slmIndices.find(idx => idx > slmIndex) || Number.MAX_SAFE_INTEGER;
            // Find the FLM column index that falls between the current SLM and the next SLM
            const flmIndex = flmIndices.find(idx => idx > slmIndex && idx < nextSlmIndex);

            // Get category/group name from the cell before the SLM label or from column header
            // Attempt to get a meaningful name, default to "Group X"
            const groupNameCandidate = headerRow[slmIndex - 1] || headerRow[slmIndex]; // Check cell before or the SLM cell itself
            const groupName = (groupNameCandidate && typeof groupNameCandidate === 'string' && groupNameCandidate.trim() !== '')
                              ? groupNameCandidate.trim()
                              : `Group ${groupIdx + 1}`;


            // Find employee columns - all columns between FLM (or SLM if no FLM) and next SLM
            const startIndex = flmIndex !== undefined ? flmIndex + 1 : slmIndex + 1; // Use strict inequality check
            const employeeIndices = [];

            for (let i = startIndex; i < nextSlmIndex; i++) {
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