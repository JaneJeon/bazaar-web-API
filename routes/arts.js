const { Router } = require("express")
const upload = require("../config/multer")
const { Art } = require("../models")
const { transaction } = require("objection")
const middlewares = require("../lib/middlewares")
const assert = require("http-assert")

module.exports = Router()
  // the "discover" page
  .get("/", async (req, res) => {
    // TODO: FOR NOW, the results are not personalized
    const arts = await Art.query()
      .selectWithFavorite((req.user || {}).id)
      .paginate(req.query.after)
      .where("status", req.query.status)

    res.send(arts)
  })
  .get("/:artId", async (req, res) => {
    const art = await Art.query()
      .skipUndefined()
      .selectWithFavorite((req.user || {}).id)
      .findById(req.params.artId)
      .where("status", req.query.status)

    res.send(art)
  })
  .get("/:artId/favorites", async (req, res) => {
    const art = await Art.query().findById(req.params.artId)
    const favorites = await art
      .$relatedQuery("favoriteUsers")
      .paginate(req.query.after)

    res.send(favorites)
  })
  .get("/:artId/transactions", middlewares.ensureSignedIn, async (req, res) => {
    const art = await Art.query().findById(req.params.artId)

    // check that you're either the artist or the buyer
    assert(
      req.user.id == art.id ||
        (await art
          .$relatedQuery("transactions")
          .where("buyer_id", req.user.id)
          .count()),
      403
    )

    const transactions = await art
      .$relatedQuery("transactions")
      .selectWithAvatars()
      .paginate(req.query.after)

    res.send(transactions)
  })
  .use(middlewares.ensureVerified)
  .post(
    "/",
    upload.array("pictures", process.env.MAX_PICTURE_ATTACHMENTS),
    async (req, res) => {
      Art.filterPost(req.body)
      req.body.pictures = Array.from(req.files).map(file => file.path)

      const art = await req.user.$relatedQuery("arts").insert(req.body)

      res.status(201).send(art)
    }
  )
  .post("/:artId/favorites", async (req, res) => {
    const art = await Art.query().findById(req.params.artId)

    const favorite = await art
      .$relatedQuery("favoriteUsers")
      .relate(req.user.id)

    res.status(201).send(favorite)
  })
  .patch("/:artId", async (req, res) => {
    Art.filterPatch(req.body)

    let art = await req.user.$relatedQuery("arts").findById(req.params.artId)
    art = await art.$query().patch(req.body)

    res.send(art)
  })
  .patch("/:artId/purchase", middlewares.ensureHasPayment, async (req, res) => {
    let art = await Art.query().findById(req.params.artId)

    art = await transaction(Art.knex(), async trx =>
      art.purchase(req.user.id, req.user.stripeCustomerId, trx)
    )

    res.send(art)
  })
  .delete("/:artId", async (req, res) => {
    const art = await req.user.$relatedQuery("arts").findById(req.params.artId)
    await art.$query().delete()

    res.sendStatus(204)
  })
  .delete("/:artId/favorites", async (req, res) => {
    const art = await Art.query().findById(req.params.artId)
    await art
      .$relatedQuery("favoriteUsers")
      .unrelate()
      .where("user_id", req.user.id)

    res.sendStatus(204)
  })
