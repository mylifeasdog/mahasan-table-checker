const axios = require('axios');
const cheerio = require('cheerio');

const SLACK_OAUTH_TOKEN = process.env.SLACK_OAUTH_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL;
const INTERVAL_MINUTES = process.env.INTERVAL_MINUTES || 120; // Default to 120 minutes if not set

const checkAvailability = async () => {
  const currentDateTime = new Date();
  const currentTimeInUTCPlus7 = new Date(currentDateTime.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  
  const currentHour = currentTimeInUTCPlus7.getHours();
  
  // Don't run the check between 23:00 PM (hour 23) and 8:00 AM (hour 8) in UTC+7 timezone
  if (currentHour >= 23 || currentHour < 8) {
      console.log('Skipping check during non-working hours.');
      return;
  }
  
  try {
    const response = await axios.get('https://www.mahasanbkk.com/available-table.php#navbar');
    const html = response.data;
    const $ = cheerio.load(html);

    const sorryElement = $("#content > div.content-content > div > div.available-table-body > h4.available-table-sorry");
    const availableTableBodyContent = $("#content > div.content-content > div > div.available-table-body").html();

    if (sorryElement.length === 0) {
      console.log('Seats are available!');
      
      // Printing the content within the div available-table-body
      console.log('Content within div available-table-body:', availableTableBodyContent);

      sendMessageToSlack(`Seats are available! @ https://www.mahasanbkk.com/available-table.php#navbar\n\n\`\`\`${availableTableBodyContent}\`\`\``);
    } else {
      console.log('No seats available.');
    }
  } catch (error) {
    console.error('Error fetching the webpage:', error);
  }
};

const sendMessageToSlack = async (message) => {
  try {
    const response = await axios.post('https://slack.com/api/chat.postMessage', {
      channel: SLACK_CHANNEL,
      text: message,
    }, {
      headers: {
        Authorization: `Bearer ${SLACK_OAUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('Message sent to Slack', response.data);
  } catch (error) {
    console.error('Error sending message to Slack:', error);
  }
};

// Run the function initially
checkAvailability();

// Schedule the function to run at the interval specified by the environment variable
setInterval(checkAvailability, INTERVAL_MINUTES * 60 * 1000);
