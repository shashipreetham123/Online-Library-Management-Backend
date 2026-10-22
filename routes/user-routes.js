const express = require("express")

const router = express.Router()

const BorrowRequest = require("../dependencies/BorrowRequest")

const { ObjectId } = require("mongodb")

const processRequests = require("../services/process-requests")

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

        // Creating the Borrow Request and Inserting into the Database

        const borrowRequest = new BorrowRequest(username, bookId, timePeriod)

        await BorrowRequests.insertOne(borrowRequest)

        // Creating a Reserve If Book is Available

        const ReservesCollection = db.collection("Reserves")
        const BorrowsCollection = db.collection("Borrows")

        const accepted = await processRequests(ReservesCollection, BorrowRequests, BorrowsCollection, books, bookId)

        if (accepted) {

            const reserve = await ReservesCollection.findOne({ username, bookId })

            return res.status(200).json({
                message: "Book Successfully Reserved.",
                data: reserve
            })
        }

        return res.status(200).json({
            message: "Request Successfully Created.",
            data: borrowRequest
        })

    } catch (error) {

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

        return res.status(200).json({
            message: "Request Cancelled Successfully"
        })

    } catch (error) {

        return res.status(500).json({
            message: "Internal Server Error",
            data: error
        })

    }
})

module.exports = router