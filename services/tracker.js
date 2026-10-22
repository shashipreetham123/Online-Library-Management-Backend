const { ObjectId } = require("mongodb")
const { addRecord } = require("./history")

let prev = Date.now()

async function tracker(db) {

    // Track Overdues

    const BorrowsCollection = db.collection("Borrows")

    const borrowsBecomingOverdue = await BorrowsCollection.find({
        due: { $lt: new Date() },
        status: "borrowed"
    }).toArray()

    await BorrowsCollection.updateMany(
        {
            due: {
                $lt: new Date()
            },
            status: "borrowed"
        },
        [
            {
                $set: {
                    status: "overdue",
                    daysOverdue: {
                        $dateDiff: {
                            startDate: "$due",
                            endDate: "$$NOW",
                            unit: "day"
                        }
                    }
                }
            },
            {
                $set: {
                    fine: {
                        $multiply: ["$daysOverdue", 100]
                    },
                    checkedAt: "$$NOW"
                }
            }
        ]
    )

    const overdueHistory = await BorrowsCollection.find({
        _id: { $in: borrowsBecomingOverdue.map(borrow => borrow._id) }
    }).toArray()

    await Promise.all(overdueHistory.map(borrow =>
        addRecord(db, borrow.bookId, "overdue", borrow.username, borrow.timePeriod, borrow)
    ))

    // Reserved Not Collected

    const ReservesCollection = db.collection("Reserves")

    const BooksCollection = db.collection("books")

    const expiredReserves = await ReservesCollection.aggregate([
        {
            $match: {
                $expr: {
                    $lt: ["$toCollect", "$$NOW"]
                },
                status: "reserved"
            }
        }
    ]).toArray()

    await BooksCollection.updateMany(
        {
            _id: {
                $in: expiredReserves.map(reserve => new ObjectId(reserve.bookId))
            }
        },
        {
            $inc: {
                availableCopies: 1
            }
        }
    )

    await ReservesCollection.deleteMany({
        _id: {
            $in: expiredReserves.map(reserve => reserve._id)
        }
    })


    console.log(Date.now() - prev)
    prev = Date.now()
}

module.exports = tracker
