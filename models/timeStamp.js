const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose
  .connect("mongodb://localhost:27017/timeStamp")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

const schedulingSchema = new Schema({
  chatID: {
    type: Number,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  domain: {
    type: String,
    required: true,
  },
});

schedulingSchema.index({ time: 1 });

const Scheduling = mongoose.model("Scheduling", schedulingSchema);

module.exports = Scheduling;
