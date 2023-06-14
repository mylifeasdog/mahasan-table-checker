const puppeteer = require("puppeteer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

// Retrieve environment variables or set default values
const SLACK_OAUTH_TOKEN = process.env.SLACK_OAUTH_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL;
const INTERVAL_MINUTES = process.env.INTERVAL_MINUTES || 30;
const THRESHOLD_MINUTES = process.env.THRESHOLD_MINUTES || 10;
const START_WORKING_HOUR = process.env.START_WORKING_HOUR || 8;
const END_WORKING_HOUR = process.env.END_WORKING_HOUR || 23;

// Main function to check for table availability
const checkAvailability = async () => {
  // Get current time and convert to UTC+7 timezone
  const currentDateTime = new Date();
  const currentTimeInUTCPlus7 = new Date(
    currentDateTime.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const currentHour = currentTimeInUTCPlus7.getHours();

  // Skip checks during non-working hours
  if (currentHour >= END_WORKING_HOUR || currentHour < START_WORKING_HOUR) {
    console.log("Skipping check during non-working hours.");
    scheduleNextCheck();
    return;
  }

  // Launch a headless browser
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // Create a new page
  const page = await browser.newPage();

  try {
    // Navigate to the target webpage
    await page.goto("https://www.mahasanbkk.com/available-table.php#navbar", {
      waitUntil: "networkidle2",
    });

    // Look for the sorryElement and availableTableBody on the page
    const sorryElement = await page.$(
      "#content > div.content-content > div > div.available-table-body > h4.available-table-sorry"
    );
    const availableTableBody = await page.$(
      "#content > div.content-content > div > div.available-table-body"
    );

    // Check if sorryElement doesn't exist, indicating seats are available
    if (!sorryElement) {
      console.log("Seats are available!");

      // Extract HTML content
      const availableTableBodyContent = await page.evaluate(
        (el) => el.innerHTML,
        availableTableBody
      );

      // Parse the HTML content and extract the desired information
      const { JSDOM } = require("jsdom");
      const dom = new JSDOM(availableTableBodyContent);
      const doc = dom.window.document;

      const links = doc.querySelectorAll("a");
      const baseURL = "https://www.mahasanbkk.com";
      const reformattedContent = Array.from(links)
        .map((link) => {
          const guests = link.querySelector(
            ".available-table-content > div:first-child"
          ).textContent;
          const dateTime = link.querySelector(
            ".available-table-content > div:last-child"
          ).textContent;
          let href = link.getAttribute("href");
          href = href.replace(".", baseURL); // replace the "." with the full base URL
          return `- ${guests} (${dateTime}) [${href}]`;
        })
        .join("\n");

      // Printing the content within the div available-table-body
      console.log(
        "Content within div available-table-body:",
        availableTableBodyContent
      );

      // Capture screenshot
      await availableTableBody.screenshot({ path: "screenshot.png" });

      // Send message and screenshot to Slack
      await sendImageToSlack(
        `Seats are available! @ https://www.mahasanbkk.com/available-table.php#navbar\n\n\`\`\`${reformattedContent}\`\`\``,
        "screenshot.png"
      );
    } else {
      console.log("No seats available.");
    }
  } catch (error) {
    console.error("Error fetching the webpage:", error);
  }

  // Close the browser
  await browser.close();

  // Schedule the next check
  scheduleNextCheck();
};

// Function to send a message and an image to Slack
const sendImageToSlack = async (message, imagePath) => {
  // Create form data for the Slack API
  const form = new FormData();
  form.append("channels", SLACK_CHANNEL);
  form.append("file", fs.createReadStream(imagePath));
  form.append("initial_comment", message);

  try {
    // Make a POST request to the Slack API to upload the file
    const response = await axios.post(
      "https://slack.com/api/files.upload",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${SLACK_OAUTH_TOKEN}`,
        },
      }
    );
    console.log("Message sent to Slack", response.data);
  } catch (error) {
    console.error("Error sending message to Slack:", error);
  }
};

// Function to schedule the next availability check
const scheduleNextCheck = () => {
  // Calculate a random interval within the specified threshold
  const randomIntervalMinutes =
    parseFloat(INTERVAL_MINUTES) +
    (Math.random() * (2 * THRESHOLD_MINUTES) - THRESHOLD_MINUTES);
  const randomIntervalMilliseconds = randomIntervalMinutes * 60 * 1000;

  // Calculate the absolute time for the next check in UTC+7 timezone
  const nextCheckTime = new Date(Date.now() + randomIntervalMilliseconds);
  const nextCheckTimeInUTCPlus7 = new Date(
    nextCheckTime.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );

  // Schedule the next check
  setTimeout(checkAvailability, randomIntervalMilliseconds);
  console.log(
    `Next check scheduled at ${nextCheckTimeInUTCPlus7.toLocaleString()} in UTC+7 timezone (${randomIntervalMinutes.toFixed(
      2
    )} minutes from now)`
  );
};

// Start the first check
checkAvailability();
