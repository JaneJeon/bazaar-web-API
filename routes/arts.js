const { Router } = require("express")
const upload = require("../config/multer")
const { Art, Review } = require("../models")
const stripe = require("../lib/stripe")
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
  .use((req, res, next) => next(req.ensureVerified()))
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
    // add a review about the other party
  .post("/:artId/reviews", async (req, res) => {
    Review.filterPost(req.body)

    const art = await Art.query().findById(req.params.artId)

    assert(req.user.id == art.artistId || req.query.as == "buyer", 401)

    if (req.query.as == "buyer") {
      req.body.revieweeId = art.artistId
    } else [(req.body.revieweeId = art.buyerId)]
    req.body.reviewerId = req.user.id

    const review = art.$relatedQuery("reviews").insert(req.body)

    res.status(201).send(review)
  })
  .patch("/:artId", async (req, res) => {
    Art.filterPatch(req.body)

    let art = await req.user.$relatedQuery("arts").findById(req.params.artId)
    art = await art.$query().patch(req.body)

    res.send(art)
  })
  .patch("/:artId/purchase", async (req, res) => {
    const art = await Art.query().findById(req.params.artId)

    const charge = await stripe.charges.create({
      amount: art.price,
      currency: art.priceUnit,
      transfer_group: `${req.params.artId}`,
      customer: req.user.stripeCustomerId
    })

    art = await art.$query().patch({ status: "sold" })

    let bought = req.user.$relatedQuery("artsBought").relate(art)
    res.sendStatus(204)
  })
  // change review details, available only to the reviewer
  .patch("/:artId/reviews", async (req, res) => {
    Review.filterPatch(req.body)

    const art = await Art.query().findById(req.params.artId)

    assert(req.user.id == art.artistId || req.query.as == "buyer", 401)

    let review = await art
      .$relatedQuery("reviews")
      .patch(req.body)
      .where("reviewerId", req.user.id)

    res.status(204).send(review)
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
  // delete a review written by the user
  .delete("/:artId/reviews", async (req, res) => {
    const art = await Art.query().findById(req.params.artId)

    assert(req.user.id == art.artistId || req.query.as == "buyer", 401)

    await art
      .$relatedQuery("reviews")
      .delete()
      .where("reviewerId", req.user.id)

    res.sendStatus(204)
  })
