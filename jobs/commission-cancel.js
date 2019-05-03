const queue = require("../lib/queue")
const taskName = "commissionCancel"
const { transaction } = require("objection")
const { Update, Commission } = require("../models")
const commissionPayoutJob = require("./commission-payout")
const commissionCheckUpdateJob = require("./commission-check-update")
const commissionCheckPaymentJob = require("./commission-check-payment")
const dinero = require("dinero.js")
const slice = require("lodash/slice")
const stripe = require("../lib/stripe")
const debug = require("debug")("bazaar:jobs:commissionCancel")

exports.add = async (data, opts) => {
  if (opts.jobId) opts.jobId = `${taskName}-${opts.jobId}`
  debug("adding job " + opts.jobId || null)

  return queue.add(taskName, data, opts)
}

queue.process(taskName, async (job, data) => {
  await transaction(Update.knex(), async trx => {
    debug("processing job " + job.id)
    debug("job data:")
    debug(job.data)

    // the update from which to refund all
    const update = await Update.query(trx)
      .findById([data.commissionId, data.updateNum])
      .eager({ commission: true })
    const commission = update.commission

    // force cancel ALL commission jobs!
    // so, so, so fucking disgusting
    const checkPaymentJobIds = [...Array(Commission.maxPaymentLate).keys()].map(
      late => `${commission.id}-${late}`
    )
    const checkUpdateJobIds = [...Array(Commission.numUpdates + 1).keys()].map(
      updateNum => `${commission.id}-${updateNum}`
    )
    const payoutJobIds = checkUpdateJobIds.slice(0) // copy

    debug("checkPaymentJobIds:")
    debug(checkPaymentJobIds)
    debug("checkUpdateJobIds:")
    debug(checkUpdateJobIds)
    debug("payoutJobIds:")
    debug(payoutJobIds)

    await Promise.all([
      commissionCheckPaymentJob.cancelJobs(checkPaymentJobIds),
      commissionCheckUpdateJob.cancelJobs(checkUpdateJobIds),
      commissionPayoutJob.cancelJobs(payoutJobIds)
    ])

    debug("all jobs cancelled!")

    // refund the rest of the payment to B
    const ratio = Commission.updatePriceRatios[commission.numUpdates]
    const alreadyPaid = slice(ratio, 0, update.updateNum).reduce(
      (x, y) => x + y
    )
    const toRefund = slice(ratio, update.updateNum).reduce((x, y) => x + y)

    debug("ratio: " + JSON.stringify(ratio))
    debug(`already paid ${alreadyPaid}, to refund ${toRefund}`)

    const amount = dinero({ amount: commission.price })
      .multiply(1 - process.env.APPLICATION_FEE)
      .allocate([alreadyPaid, toRefund])[1]
      .getAmount()

    const refund = await stripe.refunds.create({
      charge: commission.stripeChargeId,
      amount
    })

    debug("refunded " + amount)

    // mark commission as cancelled
    await commission
      .$query(trx)
      .patch({ status: "cancelled", stripeRefundId: refund.id })

    debug("commission cancelled done")
  })
})
