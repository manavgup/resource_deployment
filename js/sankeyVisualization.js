/**
 * Sankey and Force-Directed Graph Visualization Module
 * Handles rendering the organizational hierarchy using D3.js
 */
const sankeyVisualization = {
    data: [], // Store the raw data
    currentView: 'sankey-hierarchy', // 'sankey-hierarchy', 'sankey-quota', or 'force'
    svg: null,
    width: 900, // Adjust as needed
    height: 600, // Adjust as needed
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    sankey: null, // D3 Sankey generator
    colorScale: d3.scaleOrdinal(d3.schemeCategory10), // Basic color scale
    brandColors: { // Define colors for brands
        "Data": "#1f77b4", // Blue
        "Automation": "#ff7f0e", // Orange
        "Infrastructure": "#2ca02c", // Green
        "CE": "#d62728", // Red
        "CSM": "#9467bd" // Purple
    },
    teamColors: { // Define colors for teams (hierarchyName)
        "BTS": "#8c564b", // Brown
        "Customer Engineering": "#e377c2", // Pink
        "Customer Success": "#7f7f7f", // Gray
        "Sales": "#bcbd22" // Olive
    },

    /**
     * Initializes the visualization module.
     * @param {Array} data - The parsed organizational data.
     */
    init: function(data) {
        console.log("[SankeyViz] Initializing with data:", data);
        this.data = data;

        // Clear previous visualization if any
        d3.select("#visualizationArea").html(""); // Use the new visualizationArea div

        // Set up SVG container
        this.svg = d3.select("#visualizationArea")
            .append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        // Define the Sankey generator
        this.sankey = d3.sankey()
            .nodeWidth(15)
            .nodePadding(12) // Reduced padding for more compact layout
            .extent([[1, 1], [this.width - 1, this.height - 5]]);

        // Populate account filter dropdown
        this.populateAccountFilter();

        // Add event listeners for filters and toggles
        d3.select("#accountFilterSankey").on("change", (event) => {
            this.updateVisualization(event.target.value);
            // Sync with main account filter
            const mainAccountFilter = document.getElementById("accountFilter");
            if (mainAccountFilter) {
                mainAccountFilter.value = event.target.value;
                // Trigger the main filter application
                if (app && typeof app.applyFilters === 'function') {
                    app.applyFilters();
                }
            }
        });

        // Add event listeners for view mode buttons
        d3.select("#sankeyHierarchyViewBtn").on("click", () => {
            this.currentView = 'sankey-hierarchy';
            d3.select("#sankeyHierarchyViewBtn").classed("active", true);
            d3.select("#sankeyQuotaViewBtn").classed("active", false);
            d3.select("#forceViewBtn").classed("active", false);
            this.updateVisualization(d3.select("#accountFilterSankey").property("value"));
        });

        d3.select("#sankeyQuotaViewBtn").on("click", () => {
            this.currentView = 'sankey-quota';
            d3.select("#sankeyHierarchyViewBtn").classed("active", false);
            d3.select("#sankeyQuotaViewBtn").classed("active", true);
            d3.select("#forceViewBtn").classed("active", false);
            this.updateVisualization(d3.select("#accountFilterSankey").property("value"));
        });

        d3.select("#forceViewBtn").on("click", () => {
            this.currentView = 'force';
            d3.select("#sankeyHierarchyViewBtn").classed("active", false);
            d3.select("#sankeyQuotaViewBtn").classed("active", false);
            d3.select("#forceViewBtn").classed("active", true);
            this.updateVisualization(d3.select("#accountFilterSankey").property("value"));
        });


        // Render the legend
        this.renderLegend();

        // Initial render (Sankey view, all accounts)
        this.updateVisualization(""); // "" signifies all accounts
    },

    /**
     * Populates the account filter dropdown with unique account names.
     */
    populateAccountFilter: function() {
        const accounts = ["", ...new Set(this.data.map(d => d.account).filter(account => account && account !== 'N/A'))].sort();
        const selectElement = d3.select("#accountFilterSankey");

        selectElement.selectAll("option")
            .data(accounts)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d === "" ? "All Accounts" : d);
    },

    /**
     * Renders the Sankey diagram.
     * @param {Array} filteredData - The data filtered by account.
     */
    renderSankey: function(filteredData) {
        console.log("[SankeyViz] Rendering Sankey diagram with data:", filteredData);
        
        // Check if svg is null before trying to use it
        if (this.svg === null) {
            console.log("[SankeyViz] Error: SVG is null in renderSankey. Visualization not initialized.");
            return; // Exit early if svg is null
        }
        
        // Clear previous visualization elements
        this.svg.selectAll("*").remove();

        let graph;
        if (this.currentView === 'sankey-hierarchy') {
            graph = this.buildSankeyData(filteredData);
        } else if (this.currentView === 'sankey-quota') {
            // Need to access dataService and quotaService here
            const rawData = dataService.rawData; // Assuming dataService is globally accessible or passed
            const personQuotas = quotaService.getAllPersonQuotas(); // Assuming quotaService is globally accessible or passed
            const accountQuotas = quotaService.getAllAccountQuotas(); // Assuming quotaService is globally accessible or passed
            const personAllocations = dataService.personAllocations; // Assuming dataService is globally accessible or passed

            graph = this.buildSellerAccountSankeyData(rawData, personQuotas, accountQuotas, personAllocations);
        }


        // Compute the Sankey layout
        sankeyVisualization.sankey(graph);

        // Draw links
        const link = sankeyVisualization.svg.append("g")
            .attr("class", "links")
            .attr("fill", "none")
            .attr("stroke-opacity", 0.5) // Increased opacity for visibility
            .selectAll("path")
            .data(graph.links)
            .enter().append("path")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke-width", d => Math.max(1, d.width))
            .style("stroke", d => { // Color links based on source node's brand or team (for hierarchy) or a default (for quota)
                 if (this.currentView === 'sankey-hierarchy') {
                     if (d.source.level === 'brand') return this.brandColors[d.source.name] || '#000';
                     if (d.source.level === 'hierarchyName') return this.teamColors[d.source.name] || '#000';
                 }
                 return '#000'; // Default color for quota view or other levels
            });

        // Add link titles (tooltips) for quota view
        if (this.currentView === 'sankey-quota') {
             link.append("title")
                 .text(d => `Allocated Quota: ${d.value.toFixed(2)}`); // Display allocated quota
        }


        // Draw nodes
        const node = this.svg.append("g")
            .attr("class", "nodes")
            .selectAll("rect")
            .data(graph.nodes)
            .enter().append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d => { // Color nodes based on their level and name
                 if (d.level === 'brand') return this.brandColors[d.name] || this.colorScale(d.name);
                 if (d.level === 'hierarchyName') return this.teamColors[d.name] || this.colorScale(d.name);
                 // For quota view, color sellers and accounts differently
                 if (this.currentView === 'sankey-quota') {
                     if (d.level === 'seller') return '#1f77b4'; // Blue for sellers
                     if (d.level === 'account') return '#ff7f0e'; // Orange for accounts
                 }
                 return this.colorScale(d.name); // Default coloring for other levels
            })
            .attr("stroke", "#000"); // Add stroke for better visibility

        // Add node titles (tooltips)
        node.append("title")
            .text(d => {
                // Create a more informative tooltip
                let tooltip = d.fullName ? `${d.fullName}` : `${d.name}`;
                tooltip += `\nLevel: ${d.level}\n`;
                if (this.currentView === 'sankey-quota' && d.level === 'seller') {
                    tooltip += `Total Quota: ${d.quota.toFixed(2)}\n`;
                    tooltip += `Allocation per Account: ${(dataService.personAllocations[d.name] || 0).toFixed(2)}`; // Assuming dataService is accessible
                } else if (this.currentView === 'sankey-quota' && d.level === 'account') {
                     tooltip += `Total Account Quota: ${d.quota.toFixed(2)}`;
                } else {
                    tooltip += `Value: ${d.value}`;
                }
                return tooltip;
            });

        // Add node labels with better positioning and text handling
        this.svg.append("g")
            .attr("class", "node-labels")
            .selectAll("text")
            .data(graph.nodes)
            .enter().append("text")
            .attr("x", d => {
                // Position labels based on node side to prevent overlap
                return d.x0 < this.width / 2 ? d.x1 + 6 : d.x0 - 6;
            })
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => d.x0 < this.width / 2 ? "start" : "end")
            .text(d => {
                // Truncate long names to prevent overlap
                const maxLength = 15;
                let label = d.name.length > maxLength ? d.name.substring(0, maxLength) + "..." : d.name;
                // Add quota to label for quota view nodes
                 if (this.currentView === 'sankey-quota') {
                     if (d.level === 'seller') {
                         label += ` (${d.quota.toFixed(0)})`; // Display total quota for seller
                     } else if (d.level === 'account') {
                         label += ` (${d.quota.toFixed(0)})`; // Display total quota for account
                     }
                 }
                 return label;
            })
            .style("font-size", "10px") // Smaller font size
            .style("pointer-events", "none"); // Prevent labels from interfering with mouse events
    },

    /**
     * Renders the force-directed graph.
     * @param {Array} filteredData - The data filtered by account.
     */
    renderForceGraph: function(filteredData) {
        console.log("[SankeyViz] Rendering Force-Directed Graph with data:", filteredData);
        
        // Check if svg is null before trying to use it
        if (this.svg === null) {
            console.log("[SankeyViz] Error: SVG is null in renderForceGraph. Visualization not initialized.");
            return; // Exit early if svg is null
        }
        
        // Clear previous visualization elements
        this.svg.selectAll("*").remove();

        const graph = this.buildForceGraphData(filteredData);

        // Force simulation setup
        const simulation = d3.forceSimulation(graph.nodes)
            .force("link", d3.forceLink(graph.links).id(d => d.id).distance(100).strength(1))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            .force("collide", d3.forceCollide().radius(30)); // Add collision detection to prevent overlap

        // Draw links
        const link = this.svg.append("g")
            .attr("class", "links")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(graph.links)
            .enter().append("line")
            .attr("stroke-width", 2);

        // Draw nodes
        const node = this.svg.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(graph.nodes)
            .enter().append("circle")
            .attr("r", 8)
            .attr("fill", d => {
                if (d.level === 'brand') return this.brandColors[d.name] || this.colorScale(d.name);
                if (d.level === 'hierarchyName') return this.teamColors[d.name] || this.colorScale(d.name);
                return this.colorScale(d.name);
            })
            .call(d3.drag()
                .on("start", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }));

        // Add tooltips
        node.append("title")
            .text(d => {
                // Create a more informative tooltip
                let tooltip = `${d.name}\n`;
                tooltip += `Level: ${d.level}`;
                return tooltip;
            });

        // Add labels with better positioning
        const labels = this.svg.append("g")
            .attr("class", "labels")
            .selectAll("text")
            .data(graph.nodes)
            .enter().append("text")
            .attr("text-anchor", "middle")
            .attr("dy", -10)
            .text(d => {
                // Truncate long names to prevent overlap
                const maxLength = 15;
                return d.name.length > maxLength ? d.name.substring(0, maxLength) + "..." : d.name;
            })
            .style("font-size", "10px"); // Smaller font size

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            labels
                .attr("x", d => d.x)
                .attr("y", d => d.y);
        });
    },

    /**
     * Renders the legend for the color scheme.
     */
    renderLegend: function() {
        console.log("[SankeyViz] Rendering legend.");
        const legendArea = d3.select("#legendArea");
        legendArea.html(""); // Clear previous legend

        // Add Brand Legend
        legendArea.append("h6").text("Brands/Roles");
        const brandLegend = legendArea.append("div");

        Object.entries(this.brandColors).forEach(([brand, color]) => {
            brandLegend.append("div")
                .style("display", "flex")
                .style("align-items", "center")
                .html("<div style=\"width: 20px; height: 20px; background-color: " + color + "; margin-right: 5px;\"></div><span>" + brand + "</span>");
        });

        // Add Team Legend
        legendArea.append("h6").text("Teams").style("margin-top", "10px");
        const teamLegend = legendArea.append("div");

        Object.entries(this.teamColors).forEach(([team, color]) => {
            teamLegend.append("div")
                .style("display", "flex")
                .style("align-items", "center")
                .html("<div style=\"width: 20px; height: 20px; background-color: " + color + "; margin-right: 5px;\"></div><span>" + team + "</span>");
        });
        
        // Add Person Type Legend
        legendArea.append("h6").text("Person Types").style("margin-top", "10px");
        const personTypeLegend = legendArea.append("div");
        
        // Add CE and CSM badges to the legend
        personTypeLegend.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("margin-bottom", "5px")
            .html("<span class=\"badge bg-info\" style=\"margin-right: 5px;\">CE</span><span>Customer Engineer</span>");
            
        personTypeLegend.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .html("<span class=\"badge bg-success\" style=\"margin-right: 5px;\">CSM</span><span>Customer Success Manager</span>");
    },

    /**
     * Updates the visualization based on selected account filter.
     * @param {string} account - The selected account name, or "" for all accounts.
     */
    updateVisualization: function(account) {
        console.log("[SankeyViz] Updating visualization for account:", account);
        
        // Check if svg is null, which means the visualization hasn't been initialized yet
        if (this.svg === null) {
            console.log("[SankeyViz] Visualization not initialized yet. Skipping update.");
            return; // Exit early if not initialized
        }
        
        let filteredData = this.data;
        if (account !== "") {
            filteredData = this.data.filter(d => d.account === account);
        }

        if (this.currentView === 'sankey-hierarchy' || this.currentView === 'sankey-quota') {
            this.renderSankey(filteredData);
        } else {
            this.renderForceGraph(filteredData);
        }
    },

    /**
     * Toggles between Sankey and Force-Directed Graph views.
     */
    toggleView: function() {
        this.currentView = this.currentView === 'sankey' ? 'force' : 'sankey';
        console.log("[SankeyViz] Toggled view to:", this.currentView);
        // Re-render with current filter
        const currentAccountFilter = d3.select("#accountFilterSankey").property("value");
        this.updateVisualization(currentAccountFilter);
    },

    // Helper function to transform flat data to hierarchical nodes and links for Sankey
    buildSankeyData: function(data) {
        console.log("[SankeyViz] Building Sankey data structure.");
        const nodes = [];
        const links = [];
        const nodeMap = new Map();
        let nodeIndex = 0;

        // Define the hierarchy levels - Removed hierarchyName (Team) level
        const levels = ['brand', 'slm', 'flm', 'role', 'person'];

        data.forEach(d => {
            let previousNode = null;

            levels.forEach(level => {
                const value = d[level];
                if (!value || value === 'N/A') return; // Skip if value is empty or N/A

                // For nodes that would have verbatim labels like "Data BTS SLM", create custom labels
                const nodeId = level + "-" + value; // Unique ID for each node

                if (!nodeMap.has(nodeId)) {
                    // Set display name differently based on level
                    let displayName = value;
                    
                    // Fix the combined nodes labels
                    if (level === 'slm') {
                        // For SLM nodes (e.g. "Data BTS SLM") extract just the team name
                        const parts = value.split(' ');
                        if (parts.length > 1) {
                            // Extract just the team name (e.g., "BTS")
                            displayName = parts.slice(0, -1).join(' '); // Keep everything except last part ("SLM")
                        }
                    } else if (level === 'hierarchyName' && value.includes('SLM')) {
                        // Handle hierarchyName that might include "SLM"
                        displayName = value.replace(' SLM', '');
                    }
                    
                    nodeMap.set(nodeId, { 
                        name: displayName, // Use display name for rendering
                        fullName: value,   // Keep full name for tooltips
                        level: level, 
                        id: nodeIndex++ 
                    });
                    
                    nodes.push(nodeMap.get(nodeId));
                }

                const currentNode = nodeMap.get(nodeId);

                if (previousNode) {
                    // Check if a link already exists between previousNode and currentNode
                    const existingLink = links.find(link =>
                        link.source === previousNode.id && link.target === currentNode.id
                    );

                    if (existingLink) {
                        existingLink.value += 1; // Increment value for existing link
                    } else {
                        links.push({ source: previousNode.id, target: currentNode.id, value: 1 });
                    }
                }
                previousNode = currentNode;
            });
        });

        // Replace node indices with node objects in links
        const nodesById = new Map(nodes.map(d => [d.id, d]));
        links.forEach(link => {
            link.source = nodesById.get(link.source);
            link.target = nodesById.get(link.target);
        });

        console.log("[SankeyViz] Built Sankey data:", { nodes, links });
        console.log("[SankeyViz] Built Sankey data:", { nodes, links });
        return { nodes, links };
    },

    /**
     * Helper function to transform data for a Sankey diagram showing
     * allocated quota from sellers to accounts.
     * @param {Array} rawData - The raw data from dataService.js.
     * @param {Object} personQuotas - Map of person names to their total quotas.
     * @param {Object} accountQuotas - Map of account names to their total quotas.
     * @param {Object} personAllocations - Map of person names to their allocation percentages.
     * @returns {Object} Object containing nodes and links for the Sankey diagram.
     */
    buildSellerAccountSankeyData: function(rawData, personQuotas, accountQuotas, personAllocations) {
        console.log("[SankeyViz] Building Seller-Account Sankey data structure.");
        const nodes = [];
        const links = [];
        const nodeMap = new Map();
        let nodeIndex = 0;

        // Create nodes for each unique seller and account
        const uniqueSellers = new Set();
        const uniqueAccounts = new Set();

        rawData.forEach(item => {
            if (item.person && item.person !== 'N/A') uniqueSellers.add(item.person);
            if (item.account && item.account !== 'N/A') uniqueAccounts.add(item.account);
        });

        // Add seller nodes
        uniqueSellers.forEach(seller => {
            const nodeId = "seller-" + seller;
            if (!nodeMap.has(nodeId)) {
                nodeMap.set(nodeId, {
                    name: seller,
                    level: 'seller',
                    id: nodeIndex++,
                    quota: personQuotas[seller] || 0 // Add seller's total quota
                });
                nodes.push(nodeMap.get(nodeId));
            }
        });

        // Add account nodes
        uniqueAccounts.forEach(account => {
            const nodeId = "account-" + account;
            if (!nodeMap.has(nodeId)) {
                nodeMap.set(nodeId, {
                    name: account,
                    level: 'account',
                    id: nodeIndex++,
                    quota: accountQuotas[account] || 0 // Add account's total quota
                });
                nodes.push(nodeMap.get(nodeId));
            }
        });

        // Create links from sellers to accounts
        rawData.forEach(item => {
            const seller = item.person;
            const account = item.account;

            if (seller && seller !== 'N/A' && account && account !== 'N/A') {
                const sellerNodeId = "seller-" + seller;
                const accountNodeId = "account-" + account;

                const sourceNode = nodeMap.get(sellerNodeId);
                const targetNode = nodeMap.get(accountNodeId);

                if (sourceNode && targetNode) {
                    // Calculate allocated quota for this seller-account link
                    const sellerTotalQuota = personQuotas[seller] || 0;
                    const allocation = personAllocations[seller] || 0; // Allocation for this seller across all accounts
                    
                    // To get the allocation *specifically* for this link, we need to know how many times this seller appears on this account
                    // and divide the overall allocation by that count. However, the current personAllocations is 1/total_accounts.
                    // A simpler approach for the link value is to use the allocated quota for this account:
                    // Seller's Total Quota * (1 / Number of accounts seller is on)
                    // This is already implicitly handled by the structure if we just use the seller's total quota
                    // and let Sankey distribute it based on the links.
                    // Let's use the allocated quota for this specific account based on the 1/N allocation.
                    const allocatedQuota = sellerTotalQuota * allocation;


                    // Check if a link already exists between this seller and account
                    const existingLink = links.find(link =>
                        link.source.id === sourceNode.id && link.target.id === targetNode.id
                    );

                    if (existingLink) {
                        existingLink.value += allocatedQuota; // Sum allocated quota for existing link
                    } else {
                        links.push({ source: sourceNode.id, target: targetNode.id, value: allocatedQuota });
                    }
                }
            }
        });

        // Filter out nodes that are not connected to any links
        const connectedNodeIds = new Set();
        links.forEach(link => {
            connectedNodeIds.add(link.source.id);
            connectedNodeIds.add(link.target.id);
        });

        const filteredNodes = nodes.filter(node => connectedNodeIds.has(node.id));

        // Update link source and target to use filtered node objects
        const filteredNodeMap = new Map(filteredNodes.map(d => [d.id, d]));
        const filteredLinks = links.filter(link =>
            filteredNodeMap.has(link.source.id) && filteredNodeMap.has(link.target.id)
        ).map(link => ({
            source: filteredNodeMap.get(link.source.id),
            target: filteredNodeMap.get(link.target.id),
            value: link.value
        }));


        console.log("[SankeyViz] Built Seller-Account Sankey data:", { nodes: filteredNodes, links: filteredLinks });
        return { nodes: filteredNodes, links: filteredLinks };
    },


    // Helper function to transform flat data to nodes and links for Force Graph
    buildForceGraphData: function(data) {
        console.log("[SankeyViz] Building Force Graph data structure.");
        const nodes = [];
        const links = [];
        const nodeMap = new Map();
        let nodeIndex = 0;

        // Define the hierarchy levels with all organizational layers
        const levels = ['brand', 'hierarchyName', 'slm', 'flm', 'role', 'person'];

        data.forEach(d => {
            let previousNode = null;

            levels.forEach(level => {
                const value = d[level];
                if (!value || value === 'N/A') return; // Skip if value is empty or N/A

                const nodeId = level + "-" + value; // Unique ID for each node

                if (!nodeMap.has(nodeId)) {
                    nodeMap.set(nodeId, { name: value, level: level, id: nodeIndex++ });
                    nodes.push(nodeMap.get(nodeId));
                }

                const currentNode = nodeMap.get(nodeId);

                if (previousNode) {
                    // Check if a link already exists between previousNode and currentNode
                    const existingLink = links.find(link =>
                        (link.source.id === previousNode.id && link.target.id === currentNode.id) ||
                        (link.source.id === currentNode.id && link.target.id === previousNode.id)
                    );

                    if (!existingLink) {
                        // For force graph, links don't necessarily need a value, but we can add one if needed
                        links.push({ source: previousNode.id, target: currentNode.id });
                    }
                }
                previousNode = currentNode;
            });
        });

        console.log("[SankeyViz] Built Force Graph data:", { nodes, links });
        return { nodes, links };
    }
};
