/**
 * Configuration settings for the Account Deployment Dashboard
 */
const config = {
    // API endpoints
    api: {
        data: '/api/data',
        filters: '/api/filters',
        accountDetails: '/api/account_details/',
        accountDetailsFTE: '/api/account_details_fte/',
        visualize: {
            accounts: '/api/visualize/accounts',
            accountsFTE: '/api/visualize/accounts_fte',
            technologies: '/api/visualize/technologies',
            technologiesFTE: '/api/visualize/technologies_fte'
        }
    },
    
    // Chart default settings
    charts: {
        height: 600,
        marginBottom: 150,
        tickAngle: -45,
        displayLimit: 100, // Max number of results to display in tables
    },
    
    // Default colors for technology areas
    colors: {
        Data: 'rgb(31, 119, 180)',
        Automation: 'rgb(255, 127, 14)',
        Infrastructure: 'rgb(44, 160, 44)'
    },
    
    // Debug mode (set to true to see console logs)
    debug: true
};