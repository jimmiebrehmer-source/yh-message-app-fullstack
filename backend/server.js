import "dotenv/config"
import helmet from "helmet"
import cors from "cors"
import express from "express"
import mongoose from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { Message } from "./models/Message.js"
import { User } from "./models/User.js"
import { authenticateUser } from "./middleware/auth.js"
import "./config/db.js"
import listEndpoints from "express-list-endpoints"

// SÄKERHET: Applikationen startar inte om JWT_SECRET saknas i miljövariablerna.
// Detta förhindrar att JWT-tokens signeras med ett tomt eller förutsägbart värde,
// vilket annars skulle möjliggöra förfalskning av tokens (STRIDE: Spoofing).
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set in .env")

const PORT = process.env.PORT || "3000"
const app = express()

// SÄKERHET: helmet() sätter automatiskt säkerhetsrelaterade HTTP-headers,
// t.ex. X-Content-Type-Options, X-Frame-Options och Content-Security-Policy.
// Detta är en del av "Defense in Depth" – flera lager av skydd.
app.use(helmet())

// OBS: cors({ origin: "*" }) tillåter anrop från alla domäner.
// I produktion bör detta begränsas till specifika betrodda origins,
// t.ex. origin: "https://din-app.com", för att minska risken för
// obehöriga cross-origin-anrop (STRIDE: Elevation of Privilege).
app.use(cors({
  origin: "*",
}))

app.use(express.json())

app.get("/", (req, res) => {
  res.send(listEndpoints(app))
})

// --- REGISTRERING ---
app.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body

    // SÄKERHET: Validering av användarnamn på serversidan.
    // Klientvalidering kan kringgås – backend måste alltid validera själv.
    // (Säkerhetskrav: Input Validation, STRIDE: Tampering)
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Username must be at least 2 characters" })
    }

    // SÄKERHET: Kontrollerar om email eller användarnamn redan finns
    // innan ett nytt konto skapas, för att förhindra duplicerade identiteter.
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }]
    })

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? "email" : "username"
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists`
      })
    }

    // SÄKERHET: Lösenordet hashas med bcrypt (saltfaktor 10) innan det lagras.
    // Lösenordet sparas ALDRIG i klartext i databasen.
    // (Säkerhetskrav: Secure Authentication, STRIDE: Information Disclosure)
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({ username: username.trim(), email, password: hashedPassword })
    await user.save()

    // SÄKERHET: JWT-token signeras med JWT_SECRET och löper ut efter 2 timmar.
    // Begränsad livslängd minskar risken om en token skulle läcka.
    // (Säkerhetskrav: Secure Authentication, STRIDE: Spoofing)
    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    )

    res.status(201).json({
      success: true,
      message: "User created successfully",
      response: {
        username: user.username,
        id: user._id,
        accessToken,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Could not create user",
      error: error,
    })
  }
})

// --- INLOGGNING ---
app.post("/login", async (req, res) => {
  try {
    const { login, password } = req.body

    // SÄKERHET: Tillåter inloggning med både användarnamn och email.
    // Returnerar samma felmeddelande oavsett om felet beror på fel
    // användarnamn eller fel lösenord – detta förhindrar "user enumeration"
    // där en angripare annars kan lista ut vilka konton som finns.
    // (STRIDE: Information Disclosure)
    const user = await User.findOne({
      $or: [{ username: login }, { email: login }]
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No account found with that username or email",
        response: null,
      })
    }

    // SÄKERHET: bcrypt.compare() jämför lösenordet mot det lagrade hashvärdet
    // utan att avslöja det faktiska lösenordet.
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
        response: null,
      })
    }

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    )

    res.json({
      success: true,
      message: "Logged in successfully",
      response: {
        username: user.username,
        id: user._id,
        accessToken,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error,
    })
  }
})

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id)

// --- HÄMTA MEDDELANDEN (publik endpoint) ---
app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: "desc" })
      .limit(20)
      .populate("user", "username")
      .exec()
    res.json(messages)
  } catch (error) {
    res.status(500).json({ message: "Could not fetch messages" })
  }
})

// --- SKAPA MEDDELANDE ---
// SÄKERHET: authenticateUser-middleware kontrollerar att användaren är
// inloggad via giltig JWT innan meddelandet sparas.
// (Säkerhetskrav: Access Control, STRIDE: Spoofing/Elevation of Privilege)
app.post("/messages", authenticateUser, async (req, res) => {
  // NOTERING: Längdvalidering (3–140 tecken) hanteras i Message-modellen via
  // minlength/maxlength på schemanivå. Se models/Message.js.
  const message = new Message({ message: req.body.message, user: req.user._id })
  try {
    const saved = await message.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: "Could not save message", errors: err.errors })
  }
})

// --- REDIGERA MEDDELANDE ---
app.patch("/messages/:id", authenticateUser, async (req, res) => {
  // SÄKERHET: Validerar att ID:t är ett giltigt MongoDB ObjectId-format
  // för att undvika NoSQL-injektionsrisker och onödiga databasfrågor.
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })

    // SÄKERHET: Kontrollerar att den inloggade användaren äger meddelandet
    // innan redigering tillåts. Förhindrar att användare redigerar andras meddelanden.
    // (Säkerhetskrav 1 & 3: Access Control, STRIDE: Tampering)
    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only edit your own messages" })
    }

    message.message = req.body.editedMessage
    await message.save()
    const updated = await message.populate("user", "username")
    res.json(updated)
  } catch (error) {
    res.status(400).json({ error: "Could not update message" })
  }
})

// --- RADERA MEDDELANDE ---
// SÄKERHETSFIX: authenticateUser tillagt – tidigare saknades autentisering helt,
// vilket innebar att vem som helst kunde radera vilket meddelande som helst
// utan att vara inloggad. (Säkerhetskrav 1 & 3, STRIDE: Tampering/Elevation of Privilege)
app.delete("/messages/:id", authenticateUser, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })

    // SÄKERHETSFIX: Kontrollerar att den inloggade användaren äger meddelandet
    // innan radering tillåts. Förhindrar att användare raderar andras meddelanden.
    // (Säkerhetskrav 1: Access Control, STRIDE: Tampering)
    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only delete your own messages" })
    }

    await message.deleteOne()
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ error: "Could not delete message" })
  }
})

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
