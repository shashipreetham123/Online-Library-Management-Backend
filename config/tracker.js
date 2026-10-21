
async function tracker(db) {

    // Track Overdues

    const borrows = db.collection("borrows")

    await borrows.updateMany(
        {
            $expr: {
                $lt: ["$dateReturn", "$$NOW"]
            }
        },
        [
            {
                $set: {
                    daysOverdue: {
                        $dateDiff: {
                            startDate: "$dateReturn",
                            endDate: "$$NOW",
                            unit: "day"
                        }
                    },
                    status: "overdue",
                    checkedAt: "$$NOW"
                }
            },
            {
                $set: {
                    fine: {
                        $multiply: ["$daysOverdue", 100]
                    }
                }
            }
        ]
    );

    const history = db.collection("history")

    const records = await borrows.aggregate([
        {
            $match: {
                $expr: {
                    $lt: ["$dateCollection", "$$NOW"]
                },
                collection: "not-collected"
            }
        },
        {
            $set: {
                date: "$$NOW",
                username: "$username",
                summaryShort: {
                    $concat: [
                        "The Borrow for Book ",
                        "$title",
                        " is Cancelled Because the Book is Not Collected."
                    ]
                },
                summaryLong: {
                    $concat: [
                        "The Borrow for Book ",
                        "$title",
                        " is Cancelled Because the Book is Not Collected."
                    ]
                }
            }
        },
        {
            $project: {
                _id: 0
            }
        }
    ]).toArray();

    if (records.length > 0) {

        await history.insertMany(records)
    }
    await borrows.deleteMany(
        {
            $expr: {
                $lt: ["$dateCollection", "$$NOW"]
            },
            collection: "not-collected"
        }
    )
}

module.exports = tracker