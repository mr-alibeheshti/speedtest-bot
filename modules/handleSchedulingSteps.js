const Scheduling = require("../models/timeStamp");

function isValidURL(url) {
  // Regular expression to validate URL without http or https
  const urlRegex =
    /^((?!https?:\/\/)[a-zA-Z0-9.-]+\.[a-z]{3,})(:[0-9]{1,5})?(\/\S*)?$/;
  return urlRegex.test(url);
}

function isValidTime(time) {
  // Regular expression to validate time format HH:MM
  const timeRegex = /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

function handleSchedulingSteps(bot, chatId, text, chatState, mainMenuKeyboard) {
  const state = chatState[chatId];
  switch (state.step) {
    case 1:
      state.time = text;
      if (!isValidTime(state.time)) {
        bot.sendMessage(
          chatId,
          "فرمت زمان وارد شده صحیح نمی‌باشد. لطفاً ساعت را به صورت 17:30 وارد کنید و دوباره امتحان کنید."
        );
        return;
      }
      state.step = 2;
      bot.sendMessage(
        chatId,
        "لطفاً لینک وبسایت مورد نظر را وارد کنید (مثلاً example.com):",
        {
          reply_markup: {
            keyboard: [[{ text: "بازگشت به منوی اصلی" }]],
            resize_keyboard: true,
          },
        }
      );
      break;
    case 2:
      if (!isValidURL(text)) {
        bot.sendMessage(
          chatId,
          "لطفاً آدرس سایت را به فرمت صحیح وارد کنید، مانند: example.com"
        );
        return;
      }
      state.url = text;
      Scheduling.create({
        chatID: chatId,
        time: state.time,
        domain: state.url,
      })
        .then(() => {
          bot.sendMessage(
            chatId,
            `زمانبندی شما با موفقیت ثبت شد.\n در ساعت: ${state.time}\n برای سایت: ${state.url}`,
            {
              reply_markup: {
                keyboard: [[{ text: "بازگشت به منوی اصلی" }]],
                resize_keyboard: true,
              },
            }
          );
        })
        .catch((err) => {
          console.error("Error saving scheduling:", err);
          bot.sendMessage(chatId, "خطا در ذخیره سازی زمانبندی.");
        });

      delete chatState[chatId];
      bot.sendMessage(
        chatId,
        "لطفاً یک گزینه را انتخاب کنید:",
        mainMenuKeyboard
      );
      break;
    default:
      bot.sendMessage(chatId, "خطایی رخ داده است. لطفاً دوباره تلاش کنید.");
      delete chatState[chatId];
      bot.sendMessage(
        chatId,
        "لطفاً یک گزینه را انتخاب کنید:",
        mainMenuKeyboard
      );
      break;
  }
}

module.exports = { handleSchedulingSteps };
