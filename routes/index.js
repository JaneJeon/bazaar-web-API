const { Router } = require("express")
const assert = require("http-assert")
const sessions = require("./sessions")
const users = require("./users")
const arts = require("./arts")
const commissions = require("./commissions")
const negotiations = require("./negotiations")
const chats = require("./chats")
const { Negotiation } = require("../models")

module.exports = Router()
  .use((req, res, next) => {
    req.ensureVerified = () => assert(req.user && req.user.verified, 401)
    next()
  })
  .use("/sessions", sessions)
  .use("/users", users)
  .use("/arts", arts)
  .use("/commissions", commissions)
  .use("/commissions/:commissionId/negotiations", negotiations)
  .use("/commissions/:commissionId/negotiations/:artistId/chats", chats)
  .get("/negotiations", async (req, res) => {
    const negotiations = await Negotiation.query()
      .where("artist_id", req.user.id)
      .where("finalized", false)
      .paginate(req.query.after)

    res.send(negotiations)
  })
