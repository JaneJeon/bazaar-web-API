var queue = require("../lib/queue")
var taskName = "commissionCheckPayment"
var { transaction } = require("objection")
var { Commission } = require("../models")
var commissionCancelJob = require("./commission-cancel")
var dayjs = require("dayjs")
var debug = require("debug")("bazaar:jobs:commissionCheckPayment")

exports.add = async (data, opts) => {
  if (opts.jobId) opts.jobId = `${taskName}-${opts.jobId}`
  debug("adding job " + opts.jobId || null)

  return queue.add(taskName, data, opts)
}

exports.cancelJobs = async ids => {
  const jobs = await Promise.all(
    ids.map(id => queue.getJob(`${taskName}-${id}`))
  )

  await Promise.all(jobs.filter(v => v).map(job => job.remove()))
}

queue.process(taskName, async (job, data) => {
  await transaction(Commission.knex(), async trx => {
    debug("processing job " + job.id)
    debug("job data: %o", job.data)

    // check whether buyer has paid
    const commission = await Commission.query(trx).findById(data.commissionId)
    const transaction = await commission
      .$relatedQuery("transactions", trx)
      .where("update_num", null)
      .first()

    if (transaction) {
      debug("buyer has paid")

      // push commission deadline if buyer is late
      if (data.late) {
        debug("buyer is late by " + data.late + " days. Extending deadline")

        await commission.$query(trx).patch({
          deadline: dayjs(commission.deadline)
            .add(data.late, "day")
            .format("YYYY-MM-DD")
        })
      }
    } else {
      debug("buyer has not paid yet")
      if (++data.late == Commission.maxPaymentLate) {
        debug("buyer is 2 days late in payment. Cancelling")

        // check after 48h and the buyer still hasn't paid
        // cancel commission
        await commissionCancelJob.add(data)
      } else {
        debug("buyer is late by " + data.late + " days. Rescheduling")

        // reschedule job 24h later
        await queue.add(taskName, data, {
          delay: 24 * 60 * 60 * 1000,
          jobId: `${taskName}-${commission.id}-${data.late}`
        })
      }
    }
  })
})
