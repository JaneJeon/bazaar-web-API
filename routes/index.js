const { Router } = require("express")
const assert = require("http-assert")
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

module.exports = Router()
  .use((req, res, next) => {
    req.ensureVerified = () => assert(req.user && req.user.verified, 401)
    req.ensureHasPayment = () => assert(req.user.stripeCustomerId, 402)
    next()
  })
  .use("/sessions", sessions)
  .use("/users", users)
  .use("/arts", arts)
  .use("/commissions", commissions)
  .use("/commissions/:commissionId/negotiations", negotiations)
  .use("/commissions/:commissionId/negotiations/:artistId/chats", chats)
  .use("/reviews", reviews)
  .use((req, res, next) => next(req.ensureVerified()))
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
  .use("/commissions/:commissionId/updates", updates)
