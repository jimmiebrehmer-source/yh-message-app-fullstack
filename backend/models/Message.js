import mongoose from "mongoose"

const messageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    // SÄKERHETSFIX: Längdvalidering på schemanivå (serversidan).
    // Klientvalidering kan alltid kringgås av en angripare som skickar
    // förfrågningar direkt mot API:et. Genom att validera här säkerställs
    // att inga meddelanden kortare än 3 eller längre än 140 tecken sparas,
    // oavsett varifrån förfrågan kommer.
    // (Säkerhetskrav 4: Input Validation, STRIDE: Tampering)
    minlength: 3,
    maxlength: 140,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export const Message = mongoose.model("Message", messageSchema)