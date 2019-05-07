const { Router } = require("express")
const middlewares = require("../lib/middlewares")
const sessions = require("./sessions")
const users = require("./users")
const arts = require("./arts")
const commissions = require("./commissions")
const negotiations = require("./negotiations")
const chats = require("./chats")
const reviews = require("./reviews")
const stripe = require("./stripe")
const updates = require("./updates")
const { Negotiation } = require("../models")
const reports = require("./reports")
const transactions = require("./transactions")

module.exports = Router()
  .use("/sessions", sessions)
  .use("/users", users)
  .use("/arts", arts)
  .use("/commissions", commissions)
  .use(middlewares.ensureVerified)
  .use("/commissions/:commissionId/negotiations", negotiations)
  .use("/commissions/:commissionId/negotiations/:artistId/chats", chats)
  .get("/negotiations", async (req, res) => {
    const negotiations = await Negotiation.query()
      .selectWithAvatars()
      .where("artist_id", req.user.id)
      .where("is_artist", true)
      .where("finalized", false)
      .paginate(req.query.after, "commission_id")

    res.send(negotiations)
  })
  .use("/stripe", stripe)
  .use("/reviews", reviews)
  .use("/commissions/:commissionId/updates", updates)
  .use("/transactions", transactions)
  .use(middlewares.ensureAdmin)
  .use("/reports", reports)
