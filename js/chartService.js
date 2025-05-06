/**
 * Chart service for the Account Deployment Dashboard
 * Handles creation and rendering of all Plotly charts
 */
const chartService = {
    /**
     * Create account chart showing unique people count or FTE per account
     * @param {Object} accountData - Map of account names to values (either counts or FTE)
     * @param {string} modeIdentifier - 'unique_count' or 'fte'
     */
    createAccountChart: function(accountData, modeIdentifier) {
        console.log(`[LOG] Entering chartService.createAccountChart with modeIdentifier: ${modeIdentifier}`); // Added Log
        console.log("[LOG] accountData for chart:", accountData); // Added Log

        // Convert to array and sort
        console.log("[LOG] Preparing account chart data..."); // Added Log
        const chartData = Object.entries(accountData)
            .map(([account, value]) => ({ account, value }))
            .sort((a, b) => b.value - a.value);
        console.log(`[LOG] Prepared ${chartData.length} data points for account chart.`); // Added Log


        // Determine y-axis label and title based on mode
        const isUniqueCount = modeIdentifier === 'unique_count';
        const yAxisLabel = isUniqueCount ? 'Number of People' : 'Full-Time Equivalent (FTE)';
        const chartTitle = isUniqueCount ? 'People Deployed Per Account' : 'Allocated FTE Per Account'; // This title might be overridden by updateChartTitles

        // Create Plotly data
        const data = [{
            x: chartData.map(item => item.account),
            // Use raw value for unique count, format FTE
            y: chartData.map(item => isUniqueCount ? item.value : parseFloat(item.value.toFixed(2))),
            type: 'bar',
            marker: {
                color: 'rgb(158,202,225)' // Consider different colors?
            },
            hovertemplate: isUniqueCount ?
                'Account: %{x}<br>People: %{y}<extra></extra>' :
                'Account: %{x}<br>FTE: %{y}<extra></extra>'
        }];

        // Create layout
        const layout = {
            title: chartTitle, // Use dynamic title
            xaxis: {
                title: 'Account',
                tickangle: config.charts.tickAngle
            },
            yaxis: {
                title: yAxisLabel // Use dynamic label
            },
            height: config.charts.height,
            margin: {
                b: config.charts.marginBottom
            }
        };

        // Plot the chart
        console.log("[LOG] Calling Plotly.newPlot for accountsChart..."); // Added Log
        Plotly.newPlot('accountsChart', data, layout)
            .then(() => {
                console.log("[LOG] Plotly.newPlot for accountsChart finished successfully."); // Added Log
            })
            .catch(error => {
                console.error("[LOG] Error during Plotly.newPlot for accountsChart:", error); // Added Log
            })
            .then(() => {
                // Add click event listener after chart is plotted
                const accountsChartElement = document.getElementById('accountsChart');
                if (accountsChartElement && accountsChartElement.on) { // Check if Plotly object exists
                    accountsChartElement.on('plotly_click', function(data) {
                        if (data.points.length > 0) {
                            const clickedAccount = data.points[0].x; // Get account name from x-axis
                            console.log(`[LOG] Clicked on account chart bar: ${clickedAccount}`); // Added Log
                            if (app && typeof app.showAccountDetails === 'function') {
                                app.showAccountDetails(clickedAccount);
                            } else {
                                console.error("[LOG] app.showAccountDetails function not found!");
                            }
                        }
                    });
                    console.log("[LOG] Added plotly_click listener to accountsChart."); // Added Log
                } else {
                     console.warn("[LOG] Could not attach plotly_click listener to accountsChart.");
                }
            });

        console.log("[LOG] Exiting chartService.createAccountChart"); // Added Log
    },

    /**
     * Create Allocated FTE Deployed per account chart
     * @param {Object} techByAccountData - Nested map of account -> technology -> value
     * @param {string} viewMode - 'raw' or 'fte'
     */
    createTechnologyChart: function(techByAccountData, viewMode) {
        console.log(`[LOG] Entering chartService.createTechnologyChart with viewMode: ${viewMode}`); // Added Log
        console.log("[LOG] techByAccountData for chart:", techByAccountData); // Added Log

        // Calculate total FTE per account
        console.log("[LOG] Calculating total FTE per account..."); // Added Log
        const accountFTEData = {};
        Object.entries(techByAccountData).forEach(([account, techData]) => {
            accountFTEData[account] = Object.values(techData).reduce((sum, val) => sum + val, 0);
        });
        console.log("[LOG] Calculated FTE for each account:", accountFTEData); // Added Log

        // Sort accounts by FTE value (descending)
        console.log("[LOG] Sorting accounts by FTE value..."); // Added Log
        const sortedAccounts = Object.entries(accountFTEData)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);

        // Take top 20 accounts for clarity
        const topAccounts = sortedAccounts.slice(0, Math.min(sortedAccounts.length, 20));
        console.log(`[LOG] Using top ${topAccounts.length} accounts for FTE chart.`); // Added Log

        // Create data for the chart
        console.log("[LOG] Preparing Plotly data for FTE chart..."); // Added Log
        const plotlyData = [{
            x: topAccounts,
            y: topAccounts.map(account => parseFloat(accountFTEData[account].toFixed(2))),
            type: 'bar',
            marker: {
                color: 'rgb(158,202,225)'
            },
            hovertemplate: 'Account: %{x}<br>FTE: %{y}<extra></extra>'
        }];
        console.log(`[LOG] Prepared Plotly data for FTE chart.`); // Added Log

        // Create layout
        const layout = {
            title: 'Allocated FTE Deployed per account',
            xaxis: {
                title: 'Account',
                tickangle: config.charts.tickAngle
            },
            yaxis: {
                title: 'Full-Time Equivalent (FTE)'
            },
            height: config.charts.height,
            margin: {
                b: config.charts.marginBottom
            }
        };

        // Log for debugging
        console.log(`[LOG] Rendering FTE chart with ${topAccounts.length} accounts`);

        // Plot the chart
        console.log("[LOG] Calling Plotly.newPlot for technologiesChart..."); // Added Log
        Plotly.newPlot('technologiesChart', plotlyData, layout)
            .then(() => {
                console.log("[LOG] Plotly.newPlot for technologiesChart finished successfully."); // Added Log
            })
            .catch(error => {
                console.error("[LOG] Error during Plotly.newPlot for technologiesChart:", error); // Added Log
            })
             .then(() => {
                // Add click event listener after chart is plotted
                const techChartElement = document.getElementById('technologiesChart');
                 if (techChartElement && techChartElement.on) { // Check if Plotly object exists
                    techChartElement.on('plotly_click', function(data) {
                        if (data.points.length > 0) {
                            const clickedAccount = data.points[0].x; // Get account name from x-axis
                            console.log(`[LOG] Clicked on technology chart bar: ${clickedAccount}`); // Added Log
                            if (app && typeof app.showAccountDetails === 'function') {
                                app.showAccountDetails(clickedAccount);
                            } else {
                                console.error("[LOG] app.showAccountDetails function not found!");
                            }
                        }
                    });
                    console.log("[LOG] Added plotly_click listener to technologiesChart."); // Added Log
                } else {
                     console.warn("[LOG] Could not attach plotly_click listener to technologiesChart.");
                }
            });

        console.log("[LOG] Exiting chartService.createTechnologyChart"); // Added Log
    },

    /**
     * Create account detail technology/brand breakdown pie chart
     * @param {Object} techBreakdown - Map of technology areas to values
     * @param {string} viewMode - 'raw' or 'fte'
     */
    createAccountTechChart: function(techBreakdown, viewMode) {
        console.log(`[LOG] Entering chartService.createAccountTechChart with viewMode: ${viewMode}`); // Added Log
        console.log("[LOG] techBreakdown for account detail chart:", techBreakdown); // Added Log

        // Convert to array format for Plotly
        console.log("[LOG] Preparing account tech pie chart data..."); // Added Log
        const techData = Object.entries(techBreakdown).map(([tech, value]) => ({
            technology: tech,
            value: viewMode === 'fte' ? parseFloat(value.toFixed(2)) : value
        }));
        console.log(`[LOG] Prepared ${techData.length} data points for account tech pie chart.`); // Added Log


        // Create pie chart
        const data = [{
            type: 'pie',
            labels: techData.map(item => item.technology),
            values: techData.map(item => item.value),
            textinfo: 'label+percent',
            insidetextorientation: 'radial',
            marker: {
                colors: techData.map(item => config.colors[item.technology] || null)
            },
            hovertemplate: viewMode === 'raw' ?
                'Technology: %{label}<br>People: %{value}<br>Percentage: %{percent}<extra></extra>' :
                'Technology: %{label}<br>FTE: %{value}<br>Percentage: %{percent}<extra></extra>'
        }];

        // Create layout
        const layout = {
            title: viewMode === 'raw' ? 'Technology Breakdown' : 'Technology Breakdown (FTE)',
            height: 300,
            margin: {
                t: 30,
                b: 0,
                l: 0,
                r: 0
            }
        };

        // Log for debugging
        console.log(`[LOG] Rendering account tech chart with ${techData.length} technology areas`);

        // Plot the chart
        console.log("[LOG] Calling Plotly.newPlot for accountTechChart..."); // Added Log
        Plotly.newPlot('accountTechChart', data, layout)
            .then(() => {
                console.log("[LOG] Plotly.newPlot for accountTechChart finished successfully."); // Added Log
            })
            .catch(error => {
                console.error("[LOG] Error during Plotly.newPlot for accountTechChart:", error); // Added Log
            });

        console.log("[LOG] Exiting chartService.createAccountTechChart"); // Added Log
    }
    // Removed updateChartTitles function as titles are now set dynamically within chart creation
};
