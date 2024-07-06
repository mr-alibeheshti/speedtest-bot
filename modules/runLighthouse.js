const { exec } = require("child_process");
const { convertHtmlToPdf } = require("./convertHtmlToPdf");

async function runLighthouse(
  url,
  chatId,
  htmlFilePath,
  pdfFilePath,
  processingMessageId,
  bot,
  chatState,
  mainMenuKeyboard
) {
  const command = `lighthouse https://${url} --output html --output-path ${htmlFilePath} --quiet`;

  exec(command, async (error) => {
    if (error) {
      await bot.sendMessage(chatId, "خطا در اجرای دستور تست سرعت.");
    } else {
      try {
        await convertHtmlToPdf(htmlFilePath, pdfFilePath);
        await bot.sendDocument(
          chatId,
          pdfFilePath,
          {
            caption:
              'تست سرعت تکمیل شد 😎\n😊 میتوانید از قسمت "تاریخچه تست ها" نتایج قبلی را نیز مشاهده کنید',
          },
          { contentType: "application/pdf" }
        );
      } catch {
        await bot.sendMessage(chatId, "خطا در پردازش نتایج تست سرعت.");
      }
    }
    await bot.deleteMessage(chatId, processingMessageId);
    delete chatState[chatId];
    bot.sendMessage(chatId, "لطفاً یک گزینه را انتخاب کنید:", mainMenuKeyboard);
  });
}

module.exports = { runLighthouse };
