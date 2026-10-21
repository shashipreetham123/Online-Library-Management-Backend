const resjson = require("./resjson")

const generateUniquePin = require("./pin")

const { ObjectId } = require("mongodb")

async function initiateBorrow(books, borrowRequests, borrows, history, bookId) {
    const book = await books.findOne({
        _id: new ObjectId(bookId)
    })

    if (!book) {

        return resjson(400, {
            message: "Book Doesnot Exist in the Library",
            ignore: true
        })

    }

    const title = book.title

    const borrowRequest = await borrowRequests
        .find({ bookId })
        .sort({ requestedDate: 1 })
        .limit(1)
        .next()

    if (!borrowRequest) {

        return resjson(200, {
            message: "No Borrow Requests for this Book",
            ignore: true
        })

    }

    const { username, timePeriod } = borrowRequest

    const alreadyBorrowed = await borrows.findOne({
        bookId,
        username
    })

    if (alreadyBorrowed) {

        return resjson(400, {
            message: "Book Already Borrowed by the User.",
            ignore: true
        })

    }

    const result = await books.updateOne(
        {
            _id: new ObjectId(bookId),
            availableCopies: { $gt: 0 }
        },
        {
            $inc: { availableCopies: -1 }
        }
    );

    if (!result || result.modifiedCount == 0) {

        return resjson(200, {
            message: "Book is Unavailable",
            ignore: true
        })
    }

    const dateBorrowed = new Date()
    const dateReturn = new Date()
    const dateCollection = new Date()
    dateCollection.setDate(dateCollection.getDate() + 1)
    dateReturn.setDate(dateReturn.getDate() + timePeriod + 1)

    const pin = await generateUniquePin(borrows)

    const newBorrow = {
        bookId,
        username,
        title,
        timePeriod,
        dateBorrowed,
        dateReturn,
        dateCollection,
        pin,
        collection: "not-collected"
    }

    await borrows.insertOne(newBorrow)

    await borrowRequests.deleteOne({
        _id: new ObjectId(borrowRequest._id)
    })

    const today = new Date()

    const record = {
        username,
        date: today,
        summaryShort: `The Borrow Request for the Book '${book.title}' is Accepted`,
        summaryLong: `The Borrow Request for the Book'${book.title}' is Accepted on ${today.toLocaleDateString()}.`
    }

    await history.insertOne(record)

    return resjson(200, {
        message: "Book Successfully Borrowed by the User.",
        data: {
            pin: pin,
            expires: dateReturn
        }

    })
}

module.exports = initiateBorrow