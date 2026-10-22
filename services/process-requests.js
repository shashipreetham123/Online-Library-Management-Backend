const { ObjectId } = require("mongodb");
const Reserve = require("../dependencies/Reserve");
const { generateUniquePin } = require("./pin")

async function processRequests(ReservesCollection, BorrowRequestsCollection, BorrowsCollection, BooksCollection, bookId) {

    const bookObjectId = new ObjectId(bookId)

    const book = await BooksCollection.findOne({ _id: bookObjectId })

    if (!book) return false

    const availableCopies = book.availableCopies

    if (availableCopies == 0) return false

    const requests = await BorrowRequestsCollection
        .find({ bookId })
        .sort({ requested: 1 })
        .limit(availableCopies)

    let accepted = 0
    
    for (const request of requests) {

        const reqId = new ObjectId(request._id)

        const processed = await BorrowRequestsCollection.findOneAndDelete({ _id: reqId })

        if (!processed) continue

        const updated = await BooksCollection.fineOneAndUpdate(
            {
                _id: bookObjectId,
                availableCopies: { $gt: 0 }
            },
            {
                $inc: {
                    availableCopies: -1
                }
            }
        )

        if (!updated) {

            await BorrowRequestsCollection.create(processed.toObject())

            break
        }

        const pin = await generateUniquePin(BorrowsCollection, ReservesCollection)

        const reserve = new Reserve(request, pin)

        await ReservesCollection.insertOne(reserve)

        accepted++

    }

    return (accepted > 0)

}

module.exports = processRequests;