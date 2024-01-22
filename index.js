const errorContainer = document.getElementById("error");
const loginContainer = document.getElementById("login-container");
const graphsContainer = document.querySelector(".all-graphs");

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
    graphsContainer.style.display = "flex";
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
            showLogoutButton(); // Call this function to show the logout button
        } else {
            const errortext = await res.json();
            error(errortext.error);
        }
    } catch (err) {
        console.error(err);
        error("Error! Try again!");
    }
});

// Function to show the existing logout button
function showLogoutButton() {
    const logoutButton = document.getElementById("logout");
    if (logoutButton) {
        logoutButton.style.display = "flex"; // Set the display property to "inline-block" to make it visible
        logoutButton.addEventListener("click", logout);
    } else {
        console.error("Logout button not found");
    }
}

// Function to handle logout
function logout() {
    localStorage.removeItem("jwt"); // Remove the token from local storage
    loginContainer.style.display = "flex"; // Show the login container
    graphsContainer.style.display = "none"; // Hide the graphs container
    const logoutButton = document.getElementById("logout");
    if (logoutButton) {
        logoutButton.style.display = "none";; // Remove the logout button
    }

    // Reset the login form
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.reset();
    }
}
