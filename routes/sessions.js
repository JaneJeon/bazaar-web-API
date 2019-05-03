const { Router } = require("express")
const passport = require("passport")

module.exports = Router()
  // CREATE session
  .post("/", passport.authenticate("local"), (req, res) =>
    res.status(201).send(req.user.stripeCopy)
  )
  // DELETE session
  .delete("/", (req, res) => {
    req.session = null
    res.sendStatus(204)
  })
