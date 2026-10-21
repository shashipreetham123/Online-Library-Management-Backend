const express = require("express")

const { ObjectId } = require("mongodb")
const initiateBorrow = require("../config/initiate")


const router = express.Router()

router.get("/", (req, res) => {
    res.status(200).json(req.user)
})

router.get("/popular", async (req, res) => {
    try {
        const db = req.app.locals.db
        const books = db.collection("books")

        const popular = await books
            .find({ rating: { $gt: 4 } })
            .limit(10)
            .sort({ rating: -1 })
            .toArray()

        res.status(200).json(popular)
    } catch (error) {
        res.status(400).json({
            message: "Internal Server Error."
        })
    }
})

router.get("/search", async (req, res) => {
    try {
        const {
            title,
            author,
            minpublishyear, maxpublishyear, publishyear,
            minrating, maxrating, rating,
            category,
            available,
            sort
        } = req.query

        const limit = req.query.limit ? Number(req.query.limit) : 10
        const offset = req.query.offset ? Number(req.query.offset) : 0

        const filters = {}

        if (title) {
            filters["title"] = { $regex: title, $options: "i" }
        }
        if (author) {
            filters["author"] = { $regex: author, $options: "i" }
        }
        if (minpublishyear) {
            filters["publishedYear"] = { $gte: Number(minpublishyear) }
        }
        if (maxpublishyear) {
            filters["publishedYear"] = { $lte: Number(maxpublishyear) }
        }
        if (publishyear) {
            filters["publishedYear"] = Number(publishyear)
        }
        if (maxrating) {
            filters["rating"] = { $lte: Number(maxrating) }
        }
        if (minrating) {
            filters["rating"] = { $gte: Number(minrating) }
        }
        if (rating) {
            filters["publishedYear"] = Number(rating)
        }
        if (category) {
            filters["category"] = {
                $in: category.split(",")
            }
        }
        if (available) {
            filters["availableCopies"] = { $gt: 0 }
        }

        const db = req.app.locals.db
        const books = db.collection("books")

        let results = await books.find(filters)

        if (sort) {
            const sortBy = sort.split(",")[0]
            const order = sort.split(",")[1]

            results = await results.sort({ [sortBy]: order })

        }

        results = await results
            .skip(offset)
            .limit(limit)
            .toArray()

        res.status(200).json({
            message: "Data Loaded Successfully",
            data: results,
            meta: {
                offset,
                limit,
                length: results.length
            }
        })

    } catch (error) {
        res.status(400).json({
            message: "Internal Server Error."
        })
    }

})

router.post("/borrow", async (req, res) => {

    try {
        const username = req.user.username

        const { bookId, timePeriod } = req.body

        if (Number.isNaN(timePeriod) || !bookId) {

            return res.status(400).json({
                message: "Book ID and the Time Period are Required"
            })

        }

        if (!Number.isInteger(timePeriod) || timePeriod <= 0) {
            return res.status(400).json({
                message: "Invalid borrowing period"
            });
        }

        const db = req.app.locals.db

        const books = db.collection("books")

        const borrows = db.collection("borrows")

        const book = await books.findOne({
            _id: new ObjectId(bookId)
        })

        if (!book) {

            return res.status(400).json({
                message: "Book Doesnot Exist"
            })

        }

        const alreadyBorrowed = await borrows.findOne({
            bookId,
            username
        })

        if (alreadyBorrowed) {

            return res.status(400).json({
                message: "Book Already Borrowed by the User.",
            })

        }

        const borrowRequests = db.collection("borrowRequests")

        const userRequest = await borrowRequests.findOne({
            username,
            bookId
        })

        if (userRequest) {

            return res.status(400).json({
                message: "You Have Already Requested for the Book",
                ecode: "ALREQ"
            })

        }

        const overdues = await borrows.find({
            status: "overdue",
            username: username
        }).toArray()

        if (overdues && overdues.length > 0) {

            return res.status(400).json({
                message: "Cannot Request For A Book if there is an Overdue."
            })
        }

        const requestedDate = new Date()

        const newBorrowRequest = {
            username,
            bookId,
            timePeriod,
            requestedDate
        }

        borrowRequests.insertOne(newBorrowRequest)

        const history = db.collection("history")

        const record = {
            username,
            date: requestedDate,
            summaryShort: `Requested for '${book.title}' for ${timePeriod} Days`,
            summaryLong: `${username} Requested for the Book '${book.title}' on ${requestedDate.toLocaleDateString()} for ${timePeriod} Days`
        }

        await history.insertOne(record)

        return res.status(200).json({
            message: "Request Successfully Created"
        })
    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }

})

router.delete("/borrow/:bid", async (req, res) => {

    try {
        const bookId = req.params.bid

        const username = req.user.username

        const db = req.app.locals.db

        const borrowRequests = db.collection("borrowRequests")

        await borrowRequests.deleteOne({
            username,
            bookId
        })

        const today = new Date()

        const record = {
            username,
            date: today,
            summaryShort: `The Borrow Request for the Book '${book.title}' is Deleted`,
            summaryLong: `The Borrow Request for the Book'${book.title}' is Deleted on ${today.toLocaleDateString()}.`
        }

        await history.insertOne(record)

        return res.status(200).json({
            message: "Deleted Request Successfully"
        })
    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }

})

router.post("/borrow/initiate/:bid", async (req, res) => {

    try {

        const db = req.app.locals.db

        const books = db.collection("books")

        const history = db.collection("history")

        const borrows = db.collection("borrows")

        const borrowRequests = db.collection("borrowRequests")

        const bookId = req.params.bid

        const response = await initiateBorrow(books, borrowRequests, borrows, history, bookId)

        res.status(response.status).json(response.json)

    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }

})

router.get("/request/status/:bid", async (req, res) => {

    try {

        const db = req.app.locals.db

        const username = req.user.username

        const borrowRequests = db.collection("borrowRequests")

        const borrows = db.collection("borrows")

        const bookId = req.params.bid

        const userRequest = await borrowRequests.findOne({
            username,
            bookId
        })

        const userBorrow = await borrows.findOne({
            username,
            bookId
        })

        if (userRequest) {
            return res.status(200).json({
                data: {
                    status: "pending",
                    requestedOn: userRequest.requestedDate
                }
            })
        }

        if (userBorrow) {
            return res.status(200).json({
                data: {
                    status: "accepted",
                    acceptedOn: userBorrow.dateBorrowed
                }
            })
        }

    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }

})


router.get("/request/status", async (req, res) => {

    try {

        const db = req.app.locals.db

        const username = req.user.username

        const borrowRequests = db.collection("borrowRequests")

        const borrows = db.collection("borrows")


        const userRequests = await borrowRequests.aggregate([
            {
                $match: {
                    username: username
                }
            },
            {
                $addFields: {
                    status: "pending"
                }
            },
            {
                $project: {
                    _id: 0
                }
            }
        ]).toArray()

        const userBorrows = await borrows.aggregate([
            {
                $match: {
                    username: username
                }
            },
            {
                $addFields: {
                    status: "accepted"
                }
            },
            {
                $project: {
                    _id: 0
                }
            }
        ]).toArray()

        return res.status(200).json({
            data: {
                userRequests,
                userBorrows,
                all: [...userRequests, ...userBorrows]
            }
        })

    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }

})

router.get("/request/accepted", async (req, res) => {

    try {
        const db = req.app.locals.db

        const username = req.user.username

        const borrows = db.collection("borrows")

        const accepted = await borrows.find({
            username
        }).toArray()

        res.status(200).json({ data: accepted })


    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }


})

router.get("/overdues", async (req, res) => {

    try {
        const db = req.app.locals.db

        const username = req.user.username

        const borrows = db.collection("borrows")

        const overdues = await borrows.find({
            status: "overdue",
            username: username
        }).toArray()

        const overdueSummary = await borrows.aggregate([
            {
                $match: {
                    status: "overdue",
                    username: username
                }
            },
            {
                $group: {
                    _id: null,
                    totalOverdues: { $sum: 1 },
                    totalFine: { $sum: "$fine" }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalOverdues: 1,
                    totalFine: 1
                }
            }
        ]).next()

        if (!overdueSummary) {

            return res.status(200).json({
                message: "No Overdues",
                data: null
            })

        }

        return res.status(200).json({
            message: `Overdue Found for the User`,
            data: {
                overdues,
                overdueSummary
            }
        })
    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
})

router.get("/history", async (req, res) => {
    try {

        const username = req.user.username

        const db = req.app.locals.db

        const history = db.collection("history")

        const userHistory = await history
            .find({
                username: username
            })
            .sort({
                date: 1
            })
            .toArray()

        res.status(200).json({
            data: userHistory
        })
    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
})

module.exports = router