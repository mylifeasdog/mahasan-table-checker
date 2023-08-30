
# Mahasan Table Checker

---

#### Overview

The Mahasan Table Checker is an exclusive application designed for the [Mahasan restaurant](https://www.mahasanbkk.com/). Its primary function is to periodically check for table availability. When tables become available, notifications are sent via Slack.

#### Usage

1. Create and configure the `.env` file with the necessary details:
   ```
   SLACK_OAUTH_TOKEN=<Your Slack OAuth Token>
   SLACK_CHANNEL=<Your Slack Channel ID>
   INTERVAL_MINUTES=30
   THRESHOLD_MINUTES=10
   START_WORKING_HOUR=8
   END_WORKING_HOUR=23
   ```
   With the settings above, the application will only perform checks between 8:00 AM and 11:00 PM. Furthermore, it will check for availability every 30 minutes, with a variation of ±10 minutes.

2. Run the application using Docker Compose:
   ```
   docker-compose up --build
   ```

---

#### Contribution

Feel free to contribute to this project. Ensure to follow the existing code style and add tests for new features.

---

#### License

Refer to the attached [License.md](License.md) for licensing details.

---
