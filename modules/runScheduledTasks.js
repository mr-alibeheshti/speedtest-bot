const Scheduling = require("../models/timeStamp");
const path = require("path");
const fs = require("fs");
const { runLighthouse } = require("./runLighthouse");

async function runScheduledTasks(bot, chatState, mainMenuKeyboard) {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour
      .toString()
      .padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

    const tasks = await Scheduling.find({ time: currentTime });

    for (const task of tasks) {
      const { chatID, domain } = task;
      const reportDir = path.resolve(__dirname, `../reports/${chatID}`);
      fs.mkdirSync(reportDir, { recursive: true });

      let pdfFileName = `report-of-${domain}.pdf`;
      let pdfFilePath = path.join(reportDir, pdfFileName);
      let count = 1;

      while (fs.existsSync(pdfFilePath)) {
        pdfFileName = `report-of-${domain}-${count}.pdf`;
        pdfFilePath = path.join(reportDir, pdfFileName);
        count++;
      }

      const htmlFilePath = path.join(reportDir, "lighthouse-report.html");
      const processingMessage = await bot.sendMessage(
        chatID,
        "تست سرعت در حال انجام است..."
      );
      await runLighthouse(
        domain,
        chatID,
        htmlFilePath,
        pdfFilePath,
        processingMessage.message_id,
        bot,
        chatState,
        mainMenuKeyboard
      );
    }
  } catch (error) {
    console.error("Error running scheduled tasks:", error);
  }
}

module.exports = { runScheduledTasks };
