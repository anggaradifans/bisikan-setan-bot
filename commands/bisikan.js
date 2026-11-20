import { randomBisikan } from "../response/index.js";

export default {
  data: {
    name: "bisikan",
    description: "Minta satu bisikan.",
  },
  async execute(interaction) {
    await interaction.reply(randomBisikan());
  },
};
