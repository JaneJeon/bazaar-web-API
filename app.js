require("express-async-errors")
require("./config/passport")

const express = require("express")
const helmet = require("helmet")
const cors = require("cors")
const { json: jsonParser } = require("body-parser")
const cookieSession = require("cookie-session")
const passport = require("passport")
const rateLimit = require("express-rate-limit")
const RedisStore = require("rate-limit-redis")
const redis = require("./config/redis")
const router = require("./routes")

const { ValidationError, NotFoundError } = require("objection")
const { UniqueViolationError } = require("db-errors")

const app = express()
if (process.env.NODE_ENV == "production") app.enable("trust proxy")
app
  .use(helmet())
  .use(cors({ origin: process.env.FRONTEND_URL }))
  .use(jsonParser())
  .use(cookieSession({ secret: process.env.SESSION_SECRET, sameSite: "lax" }))
  .use(passport.initialize())
  .use(passport.session())
  .use(rateLimit({ store: new RedisStore({ client: redis }) }))
  .use(router)
  .use((req, res) => res.sendStatus(404))
  .use((err, req, res, next) => {
    // errors can happen after the response is sent
    if (res.headersSent) {
      console.error(err)
      return
    }

    if (!(err.status || err.statusCode)) {
      if (err instanceof ValidationError) err.statusCode = 400
      else if (err instanceof NotFoundError) err.statusCode = 404
      else if (err instanceof UniqueViolationError) err.statusCode = 409
      else console.error(err)
    }

    res.status(err.statusCode || err.status || 500).send(err.message)
  })

app.listen(process.env.PORT, err => {
  if (err) console.error(err)
})
