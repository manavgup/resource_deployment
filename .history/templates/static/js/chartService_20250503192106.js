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
        // Convert to array and sort
        const chartData = Object.entries(accountData)
            .map(([account, value]) => ({ account, value }))
            .sort((a, b) => b.value - a.value);
        
        // Create Plotly data
        const data = [{
            x: chartData.map(item => item.account),
            y: chartData.map(item => viewMode === 'fte' ? parseFloat(item.value.toFixed(2)) : item.value),
            type: 'bar',
            marker: {
                color: 'rgb(158,202,225)'
            },
            hovertemplate: viewMode === 'raw'
                ? 'Account: %{x}<br>People: %{y}<extra></extra>'
                : 'Account: %{x}<br>FTE: %{y}<extra></extra>'
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
        Plotly.newPlot('accountsChart', data, layout);
    },
    
    /**
     * Create technology breakdown chart
     * @param {Object} techByAccountData - Nested map of account -> technology -> value
     * @param {string} viewMode - 'raw' or 'fte'
     */
    createTechnologyChart: function(techByAccountData, viewMode) {
        // Get unique technology areas
        const technologies = new Set();
        Object.values(techByAccountData).forEach(techData => {
            Object.keys(techData).forEach(tech => technologies.add(tech));
        });
        
        const techArray = Array.from(technologies);
        
        // Sort accounts by total value (descending)
        const accounts = Object.keys(techByAccountData).sort((a, b) => {
            const totalA = Object.values(techByAccountData[a]).reduce((sum, val) => sum + val, 0);
            const totalB = Object.values(techByAccountData[b]).reduce((sum, val) => sum + val, 0);
            return totalB - totalA;
        });
        
        // Take top 20 accounts for clarity
        const topAccounts = accounts.slice(0, 20);
        
        // Create data for each technology area
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
                hovertemplate: viewMode === 'raw'
                    ? 'Account: %{x}<br>Technology: ' + tech + '<br>People: %{y}<extra></extra>'
                    : 'Account: %{x}<br>Technology: ' + tech + '<br>FTE: %{y}<extra></extra>'
            };
        });
        
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
        
        // Plot the chart
        Plotly.newPlot('technologiesChart', plotlyData, layout);
    },
    
    /**
     * Create account detail technology breakdown pie chart
     * @param {Object} techBreakdown - Map of technology areas to values
     * @param {string} viewMode - 'raw' or 'fte'
     */
    createAccountTechChart: function(techBreakdown, viewMode) {
        // Convert to array format for Plotly
        const techData = Object.entries(techBreakdown).map(([tech, value]) => ({
            technology: tech,
            value: viewMode === 'fte' ? parseFloat(value.toFixed(2)) : value
        }));
        
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
            hovertemplate: viewMode === 'raw'
                ? 'Technology: %{label}<br>People: %{value}<br>Percentage: %{percent}<extra></extra>'
                : 'Technology: %{label}<br>FTE: %{value}<br>Percentage: %{percent}<extra></extra>'
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
        
        // Plot the chart
        Plotly.newPlot('accountTechChart', data, layout);
    },
    
    /**
     * Update chart titles based on view mode
     * @param {string} viewMode - 'raw' or 'fte'
     */
    updateChartTitles: function(viewMode) {
        document.getElementById('accountsChartTitle').textContent = 
            viewMode === 'raw' ? 'People Deployed Per Account' : 'Allocated FTE Per Account';
            
        document.getElementById('technologiesChartTitle').textContent = 
            viewMode === 'raw' ? 'Technology Area Breakdown' : 'Technology Area Breakdown (FTE)';
    }
};