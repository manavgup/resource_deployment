/**
 * Quota Chart Service for the Account Deployment Dashboard
 * Handles creation and rendering of all quota-related charts
 */
const quotaChartService = {
    /**
     * Create quota chart showing quota per account
     * @param {Object} accountQuotas - Map of account names to quota values
     */
    createAccountQuotaChart: function(accountQuotas) {
        console.log(`[LOG] Entering quotaChartService.createAccountQuotaChart`);
        
        // Convert to array and sort
        const chartData = Object.entries(accountQuotas)
            .map(([account, value]) => ({ account, value }))
            .sort((a, b) => b.value - a.value);
        
        console.log(`[LOG] Prepared ${chartData.length} data points for account quota chart.`);
        
        // Create Plotly data
        const data = [{
            x: chartData.map(item => item.account),
            y: chartData.map(item => parseFloat(item.value.toFixed(2))),
            type: 'bar',
            marker: {
                color: 'rgb(255,127,80)' // Coral color to distinguish from other charts
            },
            hovertemplate: 'Account: %{x}<br>Quota: %{y}<extra></extra>'
        }];
        
        // Create layout
        const layout = {
            title: 'Quota Per Account',
            xaxis: {
                title: 'Account',
                tickangle: config.charts.tickAngle
            },
            yaxis: {
                title: 'Quota'
            },
            height: config.charts.height,
            margin: {
                b: config.charts.marginBottom
            }
        };
        
        // Plot the chart
        Plotly.newPlot('accountQuotaChart', data, layout)
            .then(() => {
                console.log("[LOG] Plotly.newPlot for accountQuotaChart finished successfully.");
                
                // Add click event listener
                const chartElement = document.getElementById('accountQuotaChart');
                if (chartElement && chartElement.on) {
                    chartElement.on('plotly_click', function(data) {
                        if (data.points.length > 0) {
                            const clickedAccount = data.points[0].x;
                            console.log(`[LOG] Clicked on account quota chart bar: ${clickedAccount}`);
                            if (app && typeof app.showAccountDetails === 'function') {
                                app.showAccountDetails(clickedAccount);
                            }
                        }
                    });
                    console.log("[LOG] Added plotly_click listener to accountQuotaChart.");
                }
            })
            .catch(error => {
                console.error("[LOG] Error during Plotly.newPlot for accountQuotaChart:", error);
            });
        
        console.log("[LOG] Exiting quotaChartService.createAccountQuotaChart");
    },
    
    /**
     * Create quota breakdown chart for a specific account
     * @param {string} accountName - Account name
     * @param {Object} quotaInfo - Quota information for the account
     */
    createAccountQuotaBreakdownChart: function(accountName, quotaInfo) {
        console.log(`[LOG] Entering quotaChartService.createAccountQuotaBreakdownChart for account: ${accountName}`);
        
        // Create FLM breakdown chart
        this.createFLMQuotaChart(accountName, quotaInfo.flm_breakdown);
        
        // Create SLM breakdown chart
        this.createSLMQuotaChart(accountName, quotaInfo.slm_breakdown);
        
        // Create brand breakdown chart
        this.createBrandQuotaChart(accountName, quotaInfo.brand_breakdown);
        
        // Create team breakdown chart
        this.createTeamQuotaChart(accountName, quotaInfo.team_breakdown);
        
        console.log(`[LOG] Exiting quotaChartService.createAccountQuotaBreakdownChart for account: ${accountName}`);
    },
    
    /**
     * Create FLM quota breakdown chart
     * @param {string} accountName - Account name
     * @param {Object} flmBreakdown - Map of FLM names to quota values
     */
    createFLMQuotaChart: function(accountName, flmBreakdown) {
        console.log(`[LOG] Creating FLM quota chart for account: ${accountName}`);
        
        // Skip if no data
        if (!flmBreakdown || Object.keys(flmBreakdown).length === 0) {
            console.log("[LOG] No FLM quota data available.");
            document.getElementById('flmQuotaChart').innerHTML = '<div class="alert alert-info">No FLM quota data available.</div>';
            return;
        }
        
        // Convert to array and sort
        const chartData = Object.entries(flmBreakdown)
            .map(([flm, value]) => ({ flm, value }))
            .sort((a, b) => b.value - a.value);
        
        // Create Plotly data
        const data = [{
            labels: chartData.map(item => item.flm),
            values: chartData.map(item => parseFloat(item.value.toFixed(2))),
            type: 'pie',
            textinfo: 'label+percent',
            insidetextorientation: 'radial',
            hovertemplate: 'FLM: %{label}<br>Quota: %{value}<br>Percentage: %{percent}<extra></extra>'
        }];
        
        // Create layout
        const layout = {
            title: 'Quota by FLM',
            height: 300,
            margin: {
                t: 30,
                b: 0,
                l: 0,
                r: 0
            }
        };
        
        // Plot the chart
        Plotly.newPlot('flmQuotaChart', data, layout)
            .then(() => {
                console.log("[LOG] Plotly.newPlot for flmQuotaChart finished successfully.");
            })
            .catch(error => {
                console.error("[LOG] Error during Plotly.newPlot for flmQuotaChart:", error);
            });
    },
    
    /**
     * Create SLM quota breakdown chart
     * @param {string} accountName - Account name
     * @param {Object} slmBreakdown - Map of SLM names to quota values
     */
    createSLMQuotaChart: function(accountName, slmBreakdown) {
        console.log(`[LOG] Creating SLM quota chart for account: ${accountName}`);
        
        // Skip if no data
        if (!slmBreakdown || Object.keys(slmBreakdown).length === 0) {
            console.log("[LOG] No SLM quota data available.");
            document.getElementById('slmQuotaChart').innerHTML = '<div class="alert alert-info">No SLM quota data available.</div>';
            return;
        }
        
        // Convert to array and sort
        const chartData = Object.entries(slmBreakdown)
            .map(([slm, value]) => ({ slm, value }))
            .sort((a, b) => b.value - a.value);
        
        // Create Plotly data
        const data = [{
            labels: chartData.map(item => item.slm),
            values: chartData.map(item => parseFloat(item.value.toFixed(2))),
            type: 'pie',
            textinfo: 'label+percent',
            insidetextorientation: 'radial',
            hovertemplate: 'SLM: %{label}<br>Quota: %{value}<br>Percentage: %{percent}<extra></extra>'
        }];
        
        // Create layout
        const layout = {
            title: 'Quota by SLM',
            height: 300,
            margin: {
                t: 30,
                b: 0,
                l: 0,
                r: 0
            }
        };
        
        // Plot the chart
        Plotly.newPlot('slmQuotaChart', data, layout)
            .then(() => {
                console.log("[LOG] Plotly.newPlot for slmQuotaChart finished successfully.");
            })
            .catch(error => {
                console.error("[LOG] Error during Plotly.newPlot for slmQuotaChart:", error);
            });
    },
    
    /**
     * Create brand quota breakdown chart
     * @param {string} accountName - Account name
     * @param {Object} brandBreakdown - Map of brand names to quota values
     */
    createBrandQuotaChart: function(accountName, brandBreakdown) {
        console.log(`[LOG] Creating brand quota chart for account: ${accountName}`);
        
        // Skip if no data
        if (!brandBreakdown || Object.keys(brandBreakdown).length === 0) {
            console.log("[LOG] No brand quota data available.");
            document.getElementById('brandQuotaChart').innerHTML = '<div class="alert alert-info">No brand quota data available.</div>';
            return;
        }
        
        // Convert to array and sort
        const chartData = Object.entries(brandBreakdown)
            .map(([brand, value]) => ({ brand, value }))
            .sort((a, b) => b.value - a.value);
        
        // Create Plotly data
        const data = [{
            labels: chartData.map(item => item.brand),
            values: chartData.map(item => parseFloat(item.value.toFixed(2))),
            type: 'pie',
            textinfo: 'label+percent',
            insidetextorientation: 'radial',
            marker: {
                colors: chartData.map(item => config.colors[item.brand] || null)
            },
            hovertemplate: 'Brand: %{label}<br>Quota: %{value}<br>Percentage: %{percent}<extra></extra>'
        }];
        
        // Create layout
        const layout = {
            title: 'Quota by Brand',
            height: 300,
            margin: {
                t: 30,
                b: 0,
                l: 0,
                r: 0
            }
        };
        
        // Plot the chart
        Plotly.newPlot('brandQuotaChart', data, layout)
            .then(() => {
                console.log("[LOG] Plotly.newPlot for brandQuotaChart finished successfully.");
            })
            .catch(error => {
                console.error("[LOG] Error during Plotly.newPlot for brandQuotaChart:", error);
            });
    },
    
    /**
     * Create team quota breakdown chart
     * @param {string} accountName - Account name
     * @param {Object} teamBreakdown - Map of team names to quota values
     */
    createTeamQuotaChart: function(accountName, teamBreakdown) {
        console.log(`[LOG] Creating team quota chart for account: ${accountName}`);
        
        // Skip if no data
        if (!teamBreakdown || Object.keys(teamBreakdown).length === 0) {
            console.log("[LOG] No team quota data available.");
            document.getElementById('teamQuotaChart').innerHTML = '<div class="alert alert-info">No team quota data available.</div>';
            return;
        }
        
        // Map for team name display (convert abbreviations to full names)
        const teamNameMap = {
            'CE': 'Client Engineering',
            'CSM': 'Customer Success Management',
            'BTS': 'Brand Technical Specialist'
        };
        
        // Log the team breakdown data
        console.log("[LOG] Team breakdown data:", teamBreakdown);
        
        // Ensure all expected teams are present with at least a minimum value
        const expectedTeams = ['CE', 'BTS', 'CSM'];
        expectedTeams.forEach(team => {
            if (!(team in teamBreakdown)) {
                teamBreakdown[team] = 0;
                console.log(`[LOG] Added missing team: ${team} with zero quota`);
            }
        });
        
        // Convert to array and sort
        const chartData = Object.entries(teamBreakdown)
            .map(([team, value]) => {
                // Ensure a minimum value for visualization purposes
                // This ensures teams with zero quota still show up in the chart
                const displayValue = value > 0 ? value : 0.001;
                return { team, value, displayValue };
            })
            .sort((a, b) => b.value - a.value);
        
        console.log("[LOG] Chart data prepared:", chartData);
        
        // Create Plotly data
        const data = [{
            labels: chartData.map(item => teamNameMap[item.team] || item.team),
            values: chartData.map(item => parseFloat(item.displayValue.toFixed(3))),
            type: 'pie',
            textinfo: 'label+percent',
            insidetextorientation: 'radial',
            hovertemplate: 'Team: %{label}<br>Quota: %{value}<br>Percentage: %{percent}<extra></extra>'
        }];
        
        // Create layout
        const layout = {
            title: 'Quota by Team',
            height: 300,
            margin: {
                t: 30,
                b: 0,
                l: 0,
                r: 0
            }
        };
        
        // Plot the chart
        Plotly.newPlot('teamQuotaChart', data, layout)
            .then(() => {
                console.log("[LOG] Plotly.newPlot for teamQuotaChart finished successfully.");
            })
            .catch(error => {
                console.error("[LOG] Error during Plotly.newPlot for teamQuotaChart:", error);
            });
    }
};
