const { ObjectId } = require("mongodb")
const { today, dateTimeString } = require("./date")

function formatDate(date) {
    return date ? dateTimeString(new Date(date)) : "an unknown date"
}

/**
 * Adds an immutable entry for a circulation event and returns the saved entry.
 * `source` supports events whose active document was just deleted.
 */
async function addRecord(db, bookId, status, username, timePeriod, source = null) {
    if (!ObjectId.isValid(bookId)) {
        throw new Error("Invalid book id for history record")
    }

    const Books = db.collection("books")
    const BorrowRequests = db.collection("BorrowRequests")
    const Borrows = db.collection("Borrows")
    const Reserves = db.collection("Reserves")
    const History = db.collection("History")
    const book = await Books.findOne({ _id: new ObjectId(bookId) })

    if (!book) {
        throw new Error("Book not found for history record")
    }

    let event = source
    if (!event) {
        const collections = { request: BorrowRequests, reserved: Reserves, borrowed: Borrows, overdue: Borrows }
        const collection = collections[status]
        if (collection) event = await collection.findOne({ username, bookId })
    }

    const title = book.title
    const record = { bookId, title, username, status, date: today(), summaryLong: null, summaryShort: null }

    switch (status) {
        case "request":
            record.summaryLong = `${username} requested '${title}' on ${formatDate(event?.requested)} for ${event?.timePeriod ?? timePeriod} days.`
            record.summaryShort = `Requested '${title}'.`
            break
        case "reserved":
            record.summaryLong = `'${title}' was reserved on ${formatDate(event?.accepted)}. Collect it before ${formatDate(event?.toCollect)}.`
            record.summaryShort = `'${title}' was reserved.`
            break
        case "borrowed":
            record.summaryLong = `'${title}' was borrowed on ${formatDate(event?.borrowed)} and is due on ${formatDate(event?.due)}.`
            record.summaryShort = `'${title}' was borrowed for ${event?.timePeriod ?? timePeriod} days.`
            break
        case "returned":
            record.summaryLong = `'${title}' was returned on ${formatDate(record.date)}.`
            record.summaryShort = `'${title}' was returned.`
            break
        case "reserve-cancel":
            record.summaryLong = `The reservation for '${title}' was cancelled on ${formatDate(record.date)}.`
            record.summaryShort = `Reservation for '${title}' was cancelled.`
            break
        case "request-cancel":
            record.summaryLong = `The request for '${title}' was cancelled on ${formatDate(record.date)}.`
            record.summaryShort = `Request for '${title}' was cancelled.`
            break
        case "overdue":
            record.summaryLong = `'${title}' became overdue on ${formatDate(event?.due)}. ${event?.daysOverdue ?? 0} day(s) overdue; current fine: ${event?.fine ?? 0}.`
            record.summaryShort = `'${title}' is overdue.`
            break
        default:
            throw new Error(`Unsupported history status: ${status}`)
    }

    const result = await History.insertOne(record)
    return { ...record, _id: result.insertedId }
}

module.exports = {addRecord}
