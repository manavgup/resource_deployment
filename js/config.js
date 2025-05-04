/**
 * Configuration settings for the Account Deployment Dashboard
 */
const config = {
    // Chart default settings
    charts: {
        height: 600,
        marginBottom: 150,
        tickAngle: -45,
        displayLimit: 100, // Max number of results to display in tables
    },
    
    // Default colors for different brands
    colors: {
        'Data': 'rgb(31, 119, 180)',      // Blue
        'Automation': 'rgb(255, 127, 14)', // Orange
        'Infrastructure': 'rgb(44, 160, 44)' // Green
    },
    
    // Debug mode (set to true to see console logs)
    debug: true,
    
    // FTE allocation mode: 'equal' or 'weighted'
    // - 'equal': Divide a person's FTE equally across all accounts they appear on
    // - 'weighted': Allocate FTE based on relative importance of accounts (not implemented yet)
    fteAllocationMode: 'equal'
};