/**
 * Chart service for the Account Deployment Dashboard
 * Handles creation and rendering of all Plotly charts
 */
const chartService = {
    /**
     * Create account chart showing people or FTE per account
     * @param {Object} accountData - Map of account names to values
     * @param {string} viewMode - 'raw' or 'fte'
     */
    createAccountChart: function(accountData, viewMode) {
        console.log(`[LOG] Entering chartService.createAccountChart with viewMode: ${viewMode}`); // Added Log
        console.log("[LOG] accountData for chart:", accountData); // Added Log

        // Convert to array and sort
        console.log("[LOG] Preparing account chart data..."); // Added Log
        const chartData = Object.entries(accountData)
            .map(([account, value]) => ({ account, value }))
            .sort((a, b) => b.value - a.value);
        console.log(`[LOG] Prepared ${chartData.length} data points for account chart.`); // Added Log


        // Create Plotly data
        const data = [{
            x: chartData.map(item => item.account),
            y: chartData.map(item => viewMode === 'fte' ? parseFloat(item.value.toFixed(2)) : item.value),
            type: 'bar',
            marker: {
                color: 'rgb(158,202,225)'
            },
            hovertemplate: viewMode === 'raw' ?
                'Account: %{x}<br>People: %{y}<extra></extra>' :
                'Account: %{x}<br>FTE: %{y}<extra></extra>'
        }];

        // Create layout
        const layout = {
            title: viewMode === 'raw' ? 'People Deployed Per Account' : 'Allocated FTE Per Account',
            xaxis: {
                title: 'Account',
                tickangle: config.charts.tickAngle
            },
            yaxis: {
                title: viewMode === 'raw' ? 'Number of People' : 'Full-Time Equivalent (FTE)'
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
            });

        console.log("[LOG] Exiting chartService.createAccountChart"); // Added Log
    },

    /**
     * Create technology/brand breakdown chart
     * @param {Object} techByAccountData - Nested map of account -> technology -> value
     * @param {string} viewMode - 'raw' or 'fte'
     */
    createTechnologyChart: function(techByAccountData, viewMode) {
        console.log(`[LOG] Entering chartService.createTechnologyChart with viewMode: ${viewMode}`); // Added Log
        console.log("[LOG] techByAccountData for chart:", techByAccountData); // Added Log

        // Get unique technology areas
        console.log("[LOG] Identifying unique technologies..."); // Added Log
        const technologies = new Set();
        Object.values(techByAccountData).forEach(techData => {
            Object.keys(techData).forEach(tech => technologies.add(tech));
        });
        const techArray = Array.from(technologies);
        console.log(`[LOG] Found ${techArray.length} unique technologies.`); // Added Log


        // Sort accounts by total value (descending)
        console.log("[LOG] Sorting accounts by total value..."); // Added Log
        const accounts = Object.keys(techByAccountData).sort((a, b) => {
            const totalA = Object.values(techByAccountData[a]).reduce((sum, val) => sum + val, 0);
            const totalB = Object.values(techByAccountData[b]).reduce((sum, val) => sum + val, 0);
            return totalB - totalA;
        });

        // Take top 20 accounts for clarity (adjust if needed for your 54 rows)
        const topAccounts = accounts.slice(0, Math.min(accounts.length, 20)); // Adjusted limit
        console.log(`[LOG] Using top ${topAccounts.length} accounts for technology chart.`); // Added Log


        // Create data for each technology area
        console.log("[LOG] Preparing Plotly data for technology chart..."); // Added Log
        const plotlyData = techArray.map(tech => {
            return {
                x: topAccounts,
                y: topAccounts.map(account => {
                    const value = techByAccountData[account][tech] || 0;
                    return viewMode === 'fte' ? parseFloat(value.toFixed(2)) : value;
                }),
                name: tech,
                type: 'bar',
                marker: {
                    color: config.colors[tech] || null
                },
                hovertemplate: viewMode === 'raw' ?
                    'Account: %{x}<br>Technology: ' + tech + '<br>People: %{y}<extra></extra>' :
                    'Account: %{x}<br>Technology: ' + tech + '<br>FTE: %{y}<extra></extra>'
            };
        });
        console.log(`[LOG] Prepared ${plotlyData.length} Plotly traces for technology chart.`); // Added Log


        // Create layout
        const layout = {
            title: viewMode === 'raw' ? 'Technology Area Breakdown' : 'Technology Area Breakdown (FTE)',
            barmode: 'stack',
            xaxis: {
                title: 'Account',
                tickangle: config.charts.tickAngle
            },
            yaxis: {
                title: viewMode === 'raw' ? 'Number of People' : 'Full-Time Equivalent (FTE)'
            },
            height: config.charts.height,
            margin: {
                b: config.charts.marginBottom
            }
        };

        // Log for debugging
        console.log(`[LOG] Rendering technology chart with ${plotlyData.length} technology areas and ${topAccounts.length} accounts`);

        // Plot the chart
        console.log("[LOG] Calling Plotly.newPlot for technologiesChart..."); // Added Log
        Plotly.newPlot('technologiesChart', plotlyData, layout)
            .then(() => {
                console.log("[LOG] Plotly.newPlot for technologiesChart finished successfully."); // Added Log
            })
            .catch(error => {
                console.error("[LOG] Error during Plotly.newPlot for technologiesChart:", error); // Added Log
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
    },

    /**
     * Update chart titles based on view mode
     * @param {string} viewMode - 'raw' or 'fte'
     */
    updateChartTitles: function(viewMode) {
        console.log(`[LOG] Entering chartService.updateChartTitles with viewMode: ${viewMode}`); // Added Log
        const accountsChartTitle = document.getElementById('accountsChartTitle');
        const technologiesChartTitle = document.getElementById('technologiesChartTitle');

        if (accountsChartTitle) {
            accountsChartTitle.textContent =
                viewMode === 'raw' ? 'People Deployed Per Account' : 'Allocated FTE Per Account';
        }

        if (technologiesChartTitle) {
            technologiesChartTitle.textContent =
                viewMode === 'raw' ? 'Brand Breakdown' : 'Brand Breakdown (FTE)';
        }
        console.log("[LOG] Exiting chartService.updateChartTitles"); // Added Log
    }
};