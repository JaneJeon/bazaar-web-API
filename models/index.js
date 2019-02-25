const { Model } = require("objection")
const knex = require("knex")
const knexfile = require("../config/database")
const User = require("./user")
const Art = require("./art")
const Commission = require("./commission")

Model.knex(knex(knexfile)) // yo dawg

module.exports = { User, Art, Commission }
