const errorContainer = document.getElementById("error");
const loginContainer = document.getElementById("login-container");
const graphsContainer = document.getElementById("app");

const error = (errorMessage) => {
    // Set error message
    document.getElementById("error-message").innerText = errorMessage;

    // Toggle the display property
    errorContainer.style.display = "flex";
    loginContainer.style.display = "none";
    graphsContainer.style.display = "none";

    // Add click event listener to close the error on click
    document.getElementById("back-home-btn").addEventListener("click", closeError);
};

const success = () => {
    // Hide error and login, show graphs
    errorContainer.style.display = "none";
    loginContainer.style.display = "none";
    graphsContainer.style.display = "block";
};

const closeError = () => {
    // Close the error container and show the login container
    errorContainer.style.display = "none";
    loginContainer.style.display = "flex";

    // Remove click event listener to prevent multiple listeners
    document.getElementById("back-home-btn").removeEventListener("click", closeError);
};

const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const usernameVal = document.getElementById("identifier").value;
    const passwordVal = document.getElementById("password").value;

    try {
        const res = await fetch("https://01.kood.tech/api/auth/signin", {
            method: "POST",
            headers: {
                "Authorization": "Basic " + btoa(`${usernameVal}:${passwordVal}`)
            }
        });

        if (res.ok) {
            const token = await res.json();
            localStorage.setItem("jwt", token);
            success();
            getData();
            const logoutButton = document.getElementById("logout");
            logoutButton.addEventListener("click", logout)
        } else {
            const errortext = await res.json();
            error(errortext.error);
        }
    } catch (err) {
        console.error(err);
        error("Error! Try again!");
    }
});


// Function to handle logout
function logout() {
    localStorage.removeItem("jwt"); // Remove the token from local storage
    loginContainer.style.display = "flex"; // Show the login container
    graphsContainer.style.display = "none"; // Hide the graphs container

    if (logoutButton) {
        logoutButton.style.display = "none";; // Remove the logout button
    }

    // Reset the login form
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.reset();
    }
}

function getData() {
    // Fetch data from the API
    fetch("https://01.kood.tech/api/graphql-engine/v1/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("jwt")}`
        },
        body: JSON.stringify({
            query: `
                query {
                    user {
                        id
                        login
                        attrs
                        totalUp
                        totalDown
                        createdAt
                        updatedAt
                        transactions(order_by: { createdAt: asc }) {
                            id
                            createdAt
                            objectId
                            type
                            amount
                            path
                            object {
                                id
                                name
                                type
                                attrs
                            }
                        }
                    }
                }
            `
        })
    })
    .then(response => response.json())
    .then(data => {
        // Extracted data from the API response
        let levelgraph = [];
        let transactions = data.data.user[0].transactions;
        let up = data.data.user[0].totalUp;
        let down = data.data.user[0].totalDown;
        let xp = 0;
        let level = 0;
        let projects = [];
        let audits = [];

        transactions.forEach(element => {
            // Extracting XP, level, projects, and audits
            if (element.type === "xp" && !element.path.includes("piscine")) {
                xp += element.amount;
                projects.push(element);
                const date = new Date(element.createdAt);
                const time = date.toLocaleString("default", { month: "short", year: "2-digit" });

                if (levelgraph.length === 0) {
                    levelgraph = generateScale(time);
                }

                levelgraph.forEach(e => {
                    if (time === e.time) {
                        e.value = xp / 1000;
                    }
                });
            }

            if (element.type === "level" && element.path.includes("/johvi/div-01/")) {
                if (element.amount > level) {
                    level = element.amount;
                }
            }

            if (element.type === "up") {
                audits.push(element);
            }
        });

        // Update HTML elements based on fetched data
        const greetingElement = document.querySelector(".greeting");
        greetingElement.textContent = `Hello, ${data.data.user[0].login}`;

        const levelElement = document.getElementById("level");
        levelElement.textContent = `${level}`;

        const totalXpElement = document.getElementById("total-xp");
        totalXpElement.textContent = `Current XP: ${(xp / 1000000).toFixed(2)} MB`;

        const doneAuditElement = document.getElementById("done");
        doneAuditElement.textContent = `Done: ${(up / 1000000).toFixed(2)} MB`;

        const receivedAuditElement = document.getElementById("received");
        receivedAuditElement.textContent = `Received: ${(down / 1000000).toFixed(2)} MB`;
        
        const ratioAuditElement = document.getElementById("ratio");
        ratioAuditElement.textContent = `Ratio: ${(up / down).toFixed(1)}`;

        // Call functions to generate graphs based on data
        makeProgressData(levelgraph);
        makePieSlice(projects, xp);
    })
    .catch(error => {
        // Handle errors if necessary
        console.error("Error fetching data:", error);
    });
}

function generateScale(start) { // function to create object element for each month from start date until now and values
    const cur = new Date(`15 ${start}`)
    const untilDateString = new Date(new Date().getFullYear(), new Date().getMonth()+1, 15).toDateString()
    const result = []
    for(; untilDateString !== cur.toDateString(); cur.setMonth(cur.getMonth()+1))
      result.push({time: cur.toLocaleString('default', { month: 'short', year: '2-digit' }), value: 0})
    return result
}

function makeProgressData(projects) {
    // Adjusting values for a cleaner graph
    for (let i = 1; i < projects.length; i++) {
        if (projects[i].value === 0) {
            projects[i].value = projects[i - 1].value;
        }
    }

    // Setting up SVG dimensions and margins
    const width = 600;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };

    // Creating SVG element
    const svg = d3.select("#xp-progression")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style('fill', 'white')
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Setting up x and y scales
    const x = d3.scalePoint().range([0, width]).padding(0.1);
    const y = d3.scaleLinear().range([height, 0]);

    // Creating line generator
    const line = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.value));

    // Setting domains for x and y scales
    x.domain(projects.map(d => d.time));
    y.domain([0, Math.ceil(d3.max(projects, d => d.value) / 500) * 500]);

    // Adding x-axis
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .style('fill', 'white')
        .call(d3.axisBottom(x));

    // Adding y-axis
    svg.append("g")
        .attr("class", "axis")
        .style('fill', 'white')
        .call(d3.axisLeft(y));

    // Adding y-axis label
    svg.append("text")
        .text("XP (kB)")
        .style('fill', 'white')
        .attr("x", -30)
        .attr("y", -5);

    // Adding the line path
    svg.append("path")
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .datum(projects)
        .attr("class", "line")
        .attr("d", line);
}

function makePieSlice(projects, xp) { // function to create pie chart for total projects
    const colors = [
        "#FF0000", // Red
        "#FFFF00", // Yellow
        "#FF1493", // Deep Pink
        "#0000FF", // Blue
        "#00FF00", // Lime Green
        "#FFA500", // Orange
        "#FF69B4", // Hot Pink
        "#00CED1", // Dark Turquoise
        "#FF6347", // Tomato
        "#FF4500", // Orange-Red
        "#1E90FF", // Dodger Blue
        "#DC143C", // Crimson
        "#FF8C00", // Dark Orange
        "#008080", // Teal
        "#FA8072"  // Salmon
      ];
      const circumfence = 2 * Math.PI * 75;
      let start = -90;
      let colorcount = 0;
      const pie = document.getElementById("pie");
      const pieCenterX = 150; // X-coordinate of the pie center
      const pieCenterY = 150; // Y-coordinate of the pie center
      const uniqueProjects = new Set(); // Set to store unique project names
  
      projects.forEach(element => {
          if (element.amount > 0 && !uniqueProjects.has(element.object.name)) {
              let slicesize = (element.amount / xp) * 360;
              let sliceradius = (element.amount / xp) * 100 * circumfence / 100;
              let info = document.getElementById("info");
              var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              circle.setAttribute("class", "circle");
              circle.setAttribute("r", 75);
              circle.setAttribute("cx", pieCenterX);
              circle.setAttribute("cy", pieCenterY);
              circle.setAttribute("fill", "transparent");
              circle.setAttribute("stroke", colors[colorcount]);
              circle.setAttribute("stroke-width", 150);
              circle.setAttribute("stroke-dasharray", `${sliceradius} ${2 * Math.PI * 75}`);
              circle.setAttribute("transform", `rotate(${start} ${pieCenterX} ${pieCenterY})`);
              pie.append(circle);
  
              uniqueProjects.add(element.object.name); // Add project name to the set
  
              circle.addEventListener("mousemove", event => {
                  info.style.visibility = "visible";
                  info.style.position = "absolute"
                  info.style.zIndex = "1"
                  info.style.color = "#fff"
                  info.style.backgroundColor = "black"
  
                  // Calculate the angle of the slice relative to the starting point
                  let angle = start + slicesize / 2;
  
                  // Convert angle to radians
                  let radians = (angle * Math.PI) / 180;
  
                  // Calculate the position of the info box based on the angle
                  let offsetX = 50 * Math.cos(radians); // Adjust this value as needed
                  let offsetY = 50 * Math.sin(radians); // Adjust this value as needed
  
                  var mouseX = event.clientX;
                  var mouseY = event.clientY;
                  info.style.left = mouseX + window.scrollX + offsetX + "px";
                  info.style.top = mouseY + window.scrollY + offsetY + "px";
                  info.innerHTML = `${element.object.name} - ${element.amount / 1000}XP (${(element.amount / xp * 100).toFixed(2)}%)`;
              });
  
              circle.addEventListener("mouseout", function () {
                  info.style.visibility = "hidden";
              });
  
              start += slicesize;
              colorcount == colors.length - 1 ? colorcount = 0 : colorcount++;
          }
      });
  }