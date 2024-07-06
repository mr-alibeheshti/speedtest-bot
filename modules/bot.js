const TelegramBot = require("node-telegram-bot-api");
const { handleSchedulingSteps } = require("./handleSchedulingSteps");
const { runLighthouse } = require("./runLighthouse");
const { runScheduledTasks } = require("./runScheduledTasks");
const Scheduling = require("../models/timeStamp");
const convertHtmlToPdf = require("./convertHtmlToPdf");
const cron = require("node-cron");
const mongoose = require("mongoose");

const path = require("path");
const fs = require("fs");

const token = "7398510955:AAFOpsOKX0YUxAoDIc9UpIOIIDnEXjr184w";
const bot = new TelegramBot(token, { polling: true });

const chatState = {};

const mainMenuKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: "🚀 تست سرعت سایت" }],
      [{ text: "😎 زمانبندی تست اتوماتیک" }],
      [{ text: "⏰ تاریخچه تست ها" }],
      [{ text: "📱 ارتباط با ما" }],
    ],
    resize_keyboard: true,
  },
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  delete chatState[chatId];
  bot.sendMessage(chatId, "لطفاً یک گزینه را انتخاب کنید:", mainMenuKeyboard);
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  let text = msg.text.trim();

  if (text.startsWith("/")) return;

  if (chatState[chatId]?.step) {
    handleSchedulingSteps(bot, chatId, text, chatState, mainMenuKeyboard);
    return;
  }

  if (chatState[chatId] === "waitingForUrl") {
    if (text === "❌ لغو تست سرعت") {
      delete chatState[chatId];
      bot.sendMessage(
        chatId,
        "لطفاً یک گزینه را انتخاب کنید:",
        mainMenuKeyboard
      );
      return;
    }

    if (!text.match(/^[a-zA-Z0-9.-]+\.[a-z]{2,}$/)) {
      bot.sendMessage(
        chatId,
        "لطفاً آدرس سایت را به فرمت صحیح وارد کنید، مانند: example.com"
      );
      return;
    }

    const reportDir = path.resolve(__dirname, `../reports/${chatId}`);
    fs.mkdirSync(reportDir, { recursive: true });

    let pdfFileName = `report-of-${text}.pdf`;
    let pdfFilePath = path.join(reportDir, pdfFileName);
    let count = 1;

    while (fs.existsSync(pdfFilePath)) {
      pdfFileName = `report-of-${text}-${count}.pdf`;
      pdfFilePath = path.join(reportDir, pdfFileName);
      count++;
    }

    const htmlFilePath = path.join(reportDir, "lighthouse-report.html");
    const processingMessage = await bot.sendMessage(
      chatId,
      "تست سرعت در حال انجام است...",
      {
        reply_markup: {
          remove_keyboard: true,
        },
      }
    );
    await runLighthouse(
      text,
      chatId,
      htmlFilePath,
      pdfFilePath,
      processingMessage.message_id,
      bot,
      chatState,
      mainMenuKeyboard
    );
  } else {
    switch (text) {
      case "🚀 تست سرعت سایت":
        chatState[chatId] = "waitingForUrl";
        bot.sendMessage(
          chatId,
          "لطفاً لینک وبسایت مورد نظر را وارد کنید.\n مانند: example.com",
          {
            reply_markup: {
              keyboard: [[{ text: "❌ لغو تست سرعت" }]],
              resize_keyboard: true,
            },
          }
        );
        break;

      case "⏰ تاریخچه تست ها":
        const reportDir = path.resolve(__dirname, `../reports/${chatId}`);
        const files = fs.existsSync(reportDir)
          ? fs.readdirSync(reportDir).filter((file) => file.endsWith(".pdf"))
          : [];

        if (files.length > 0) {
          for (const file of files) {
            const filePath = path.join(reportDir, file);
            const caption = file
              .replace(/^report-of-/, "")
              .replace(/\.pdf$/, "");
            await bot.sendDocument(chatId, filePath, {
              caption: `گزارش: ${caption}`,
              contentType: "application/pdf",
            });
          }
          bot.sendMessage(chatId, "آیا می‌خواهید تمامی گزارشات را حذف کنید؟", {
            reply_markup: {
              inline_keyboard: [
                [{ text: "بله، حذف کن", callback_data: "delete_all_reports" }],
                [{ text: "بازگشت به منوی اصلی", callback_data: "main_menu" }],
              ],
            },
          });
        } else {
          bot.sendMessage(chatId, "هیچ گزارشی وجود ندارد");
        }
        break;

      case "😎 زمانبندی تست اتوماتیک":
        bot.sendMessage(
          chatId,
          "شما گزینه زمانبندی اتوماتیک را انتخاب کرده اید",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "مشاهده زمانبندی ها",
                    callback_data: "show_all_scheduling",
                  },
                ],
                [
                  {
                    text: "ایجاد زمانبندی جدید",
                    callback_data: "create_new_scheduling",
                  },
                ],
                [{ text: "بازگشت به منوی اصلی", callback_data: "main_menu" }],
              ],
            },
          }
        );
        break;

      case "📱 ارتباط با ما":
        bot.sendMessage(
          chatId,
          `😊 برای ارتباط با تیم پشتیبانی می‌توانید از طریق زیر اقدام کنید:\n📱 شماره تماس: 09929919382\n🤳 آیدی پشتیبانی: @alibeheshti1`
        );
        break;

      default:
        bot.sendMessage(
          chatId,
          "لطفاً یک گزینه معتبر را انتخاب کنید:",
          mainMenuKeyboard
        );
        break;
    }
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  switch (data) {
    case "create_new_scheduling":
      chatState[chatId] = { step: 1 };
      bot.sendMessage(
        chatId,
        "لطفاً ساعت انجام تست روزانه را وارد نمایید (مثلاً 14:30):",
        {
          reply_markup: {
            keyboard: [[{ text: "بازگشت به منوی اصلی" }]],
            resize_keyboard: true,
          },
        }
      );
      break;

    case "delete_all_reports":
      const reportDir = path.resolve(__dirname, `../reports/${chatId}`);
      if (fs.existsSync(reportDir)) {
        fs.readdirSync(reportDir).forEach((file) =>
          fs.unlinkSync(path.join(reportDir, file))
        );
        bot.sendMessage(chatId, "تمامی گزارشات حذف شدند.");
      } else {
        bot.sendMessage(chatId, "هیچ گزارشی برای حذف وجود ندارد.");
      }
      bot.sendMessage(
        chatId,
        "لطفاً یک گزینه را انتخاب کنید:",
        mainMenuKeyboard
      );
      break;

    case "show_all_scheduling":
      Scheduling.find({ chatID: chatId })
        .then((schedules) => {
          if (schedules.length === 0) {
            bot.sendMessage(chatId, "زمانبندی تنظیم نشده است.", {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "ایجاد زمانبندی جدید",
                      callback_data: "create_new_scheduling",
                    },
                  ],
                  [{ text: "بازگشت به منوی اصلی", callback_data: "main_menu" }],
                ],
              },
            });
          } else {
            const inlineKeyboard = schedules.map((schedule) => {
              return [
                {
                  text: `${schedule.domain} - ${schedule.time}`,
                  callback_data: `schedule_${schedule._id}`,
                },
              ];
            });

            inlineKeyboard.push([
              { text: "بازگشت", callback_data: "main_menu" },
              {
                text: "حذف همه زمانبندی ها",
                callback_data: "delete_all_schedules",
              },
            ]);

            bot.sendMessage(chatId, "زمانبندی‌های شما:", {
              reply_markup: {
                inline_keyboard: inlineKeyboard,
              },
            });
          }
        })
        .catch((err) => {
          console.error("Error fetching schedules:", err);
          bot.sendMessage(chatId, "خطا در دریافت زمانبندی‌ها.");
        });
      break;

    case "delete_all_schedules":
      Scheduling.deleteMany({ chatID: chatId })
        .then(() => {
          bot.sendMessage(chatId, "تمامی زمانبندی‌ها با موفقیت حذف شدند.");
          bot.sendMessage(
            chatId,
            "لطفاً یک گزینه را انتخاب کنید:",
            mainMenuKeyboard
          );
        })
        .catch((err) => {
          console.error("Error deleting schedules:", err);
          bot.sendMessage(chatId, "خطا در حذف زمانبندی‌ها.");
        });
      break;

    default:
      if (data.startsWith("schedule_")) {
        const scheduleId = data.split("_")[1];

        Scheduling.findById(scheduleId)
          .then((schedule) => {
            if (!schedule) {
              bot.sendMessage(chatId, "زمانبندی مورد نظر یافت نشد.");
            } else {
              const message = `اطلاعات کامل زمانبندی:\n\nبرای سایت: ${schedule.domain}\nساعت: ${schedule.time}\n`;

              const inlineKeyboard = [
                [
                  {
                    text: "حذف این زمانبندی",
                    callback_data: `delete_${schedule._id}`,
                  },
                ],
                [{ text: "بازگشت", callback_data: "show_all_scheduling" }],
              ];

              bot.sendMessage(chatId, message, {
                reply_markup: {
                  inline_keyboard: inlineKeyboard,
                },
              });
            }
          })
          .catch((err) => {
            console.error("Error fetching schedule:", err);
            bot.sendMessage(chatId, "خطا در دریافت زمانبندی.");
          });
      } else if (data.startsWith("delete_")) {
        const scheduleId = data.split("_")[1];

        Scheduling.findByIdAndDelete(scheduleId)
          .then(() => {
            bot.sendMessage(chatId, "زمانبندی با موفقیت حذف شد.");
            // نمایش دوباره همه زمانبندی‌ها پس از حذف
            Scheduling.find({ chatID: chatId })
              .then((schedules) => {
                if (schedules.length === 0) {
                  bot.sendMessage(chatId, "زمانبندی تنظیم نشده است.");
                } else {
                  const inlineKeyboard = schedules.map((schedule) => {
                    return [
                      {
                        text: `${schedule.domain} - ${schedule.time}`,
                        callback_data: `schedule_${schedule._id}`,
                      },
                    ];
                  });

                  inlineKeyboard.push([
                    { text: "بازگشت", callback_data: "main_menu" },
                  ]);

                  bot.sendMessage(chatId, "زمانبندی‌های شما:", {
                    reply_markup: {
                      inline_keyboard: inlineKeyboard,
                    },
                  });
                }
              })
              .catch((err) => {
                console.error("Error fetching schedules:", err);
                bot.sendMessage(chatId, "خطا در دریافت زمانبندی‌ها.");
              });
          })
          .catch((err) => {
            console.error("Error deleting schedule:", err);
            bot.sendMessage(chatId, "خطا در حذف زمانبندی.");
          });
      } else {
        bot.sendMessage(
          chatId,
          "لطفاً یک گزینه را انتخاب کنید:",
          mainMenuKeyboard
        );
      }
      break;
  }

  bot.deleteMessage(chatId, callbackQuery.message.message_id);
});

bot.on("polling_error", (error) => {
  console.error(error);
});

cron.schedule("* * * * *", () => {
  runScheduledTasks(bot, chatState, mainMenuKeyboard);
});

module.exports = bot;
