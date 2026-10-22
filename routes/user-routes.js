const express = require("express")

const router = express.Router()

const BorrowRequest = require("../dependencies/BorrowRequest")

const { ObjectId } = require("mongodb")

const processRequests = require("../services/process-requests")

const {addRecord} = require("../services/history")

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
        if (available && available == "1") {
            filters["availableCopies"] = { $gt: 0 }
        }

        if (available && available == "0") {
            filters["availableCopies"] = 0
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

router.post("/request/borrow", async (req, res) => {

    try {

        const bookId = req.body.bookId

        const timePeriod = Number(req.body.timePeriod)

        if (!bookId || !timePeriod) {
            return res.status(400).json({
                message: "Book ID and Time Period are Required"
            })
        }

        if (Number.isNaN(timePeriod) || !Number.isInteger(timePeriod)) {

            return res.status(400).json({
                message: "Invalid Time Period"
            })

        }

        const db = req.app.locals.db

        const books = db.collection("books")
        const ReservesCollection = db.collection("Reserves")
        const BorrowsCollection = db.collection("Borrows")

        // Checking if Book Exists in the Library

        const book = await books.findOne({
            _id: new ObjectId(bookId)
        })

        if (!book) {
            return res.status(400).json({
                message: "Book Doesnot Exist."
            })
        }

        const username = req.user.username

        // Checking if User Has Overdues


        const hasOverdues = await BorrowsCollection.findOne({
            username,
            status: "overdue"
        })

        if (hasOverdues) {
            return res.status(400).json({
                message: "Cannot Request a Book if User Has Overdue."
            })
        }

        const BorrowRequests = db.collection("BorrowRequests")

        // Checking If The Same Borrow Request Exists.

        const requestExists = await BorrowRequests.findOne({
            username,
            bookId
        })

        if (requestExists) {
            return res.status(400).json({
                message: "The Book is Already Requested by the User."
            })
        }

        // Checking If the Book is Already Borrowed or Reserved by the User.

        const reserved = await ReservesCollection.findOne({
            username,
            bookId
        })

        if (reserved) {
            return res.status(400).json({
                message: "The Book is Already Reserved by the User."
            })
        }

        const borrowed = await BorrowsCollection.findOne({
            username,
            bookId
        })

        if (borrowed) {
            return res.status(400).json({
                message: "The Book is Already Borrowed by the User."
            })
        }

        // Creating the Borrow Request and Inserting into the Database

        const borrowRequest = new BorrowRequest(username, bookId, timePeriod)

        await BorrowRequests.insertOne(borrowRequest)

        // Creating a Reserve If Book is Available

        const accepted = await processRequests(ReservesCollection, BorrowRequests, BorrowsCollection, books, bookId)

        if (accepted) {

            const reserve = await ReservesCollection.findOne({ username, bookId })
            if (reserve) {
                const history = await addRecord(db, bookId, "reserved", username, timePeriod, reserve)
                
                return res.status(200).json({
                    message: "Book Successfully Reserved.",
                    data: reserve,
                    history
                })
            }
        }

        const history = await addRecord(db, bookId, "request", username, timePeriod, borrowRequest)

        return res.status(200).json({
            message: "Request Successfully Created.",
            data: borrowRequest,
            history
        })

    } catch (error) {

        console.log(error)

        return res.status(500).json({
            message: "Internal Server Error",
            data: error
        })

    }

})

router.delete("/request/borrow/:bookId", async (req, res) => {
    try {

        const bookId = req.params.bookId

        const db = req.app.locals.db

        const BorrowRequests = db.collection("BorrowRequests")

        const username = req.user.username

        const borrowRequest = await BorrowRequests.findOne({
            username,
            bookId
        })

        if (!borrowRequest) {

            return res.status(400).json({
                message: "Request Not Found."
            })

        }

        await BorrowRequests.deleteOne({
            username,
            bookId
        })

        const history = await addRecord(db, bookId, "request-cancel", username, borrowRequest.timePeriod, borrowRequest)

        return res.status(200).json({
            message: "Request Cancelled Successfully",
            data: borrowRequest,
            history
        })

    } catch (error) {

        return res.status(500).json({
            message: "Internal Server Error",
            data: error
        })

    }
})

router.post("/reserve/cancel/:pin", async (req, res) => {
    try {

        const pin = req.params.pin

        const username = req.user.username

        const db = req.app.locals.db

        const ReservesCollection = db.collection("Reserves")

        const reserve = await ReservesCollection.findOneAndDelete({
            username,
            pin
        })

        if (!reserve) {
            return res.status(400).json({
                message: "Reserve Not Found.",
            })
        }

        const BorrowRequestCollection = db.collection("BorrowRequests")
        const BorrowsCollection = db.collection("Borrows")
        const BooksCollection = db.collection("books")

        const bookId = reserve.bookId

        await BooksCollection.findOneAndUpdate(
            {
                _id: new ObjectId(bookId)
            },
            {
                $inc: {
                    availableCopies: 1
                }
            }
        )

        await processRequests(ReservesCollection, BorrowRequestCollection, BorrowsCollection, BooksCollection, bookId)

        const history = await addRecord(db, bookId, "reserve-cancel", username, reserve.timePeriod, reserve)

        return res.status(200).json({
            message: "Reserve Successfully Cancelled",
            data: reserve,
            history
        })

    } catch (error) {

        console.log(error)

        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
})

module.exports = router
