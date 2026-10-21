const express = require("express")

const { ObjectId } = require("mongodb")
const initiateBorrow = require("../config/initiate")

const router = express.Router()

router.post("/borrow/:pin", async (req, res) => {

    try {

        const db = req.app.locals.db

        const pin = req.params.pin

        const borrows = db.collection("borrows")

        const borrow = await borrows.findOne({
            pin
        })

        if (!borrow) {
            return res.status(400).json({
                message: "Invalida PIN"
            })
        }

        const username = borrow.username

        const bookId = borrow.bookId

        const books = db.collection("books")

        const book = await books.findOne({
            _id: new ObjectId(bookId)
        })

        if (!book) {
            return res.status(400).json({
                message: "Invalida Book ID"
            })
        }

        await borrows.updateOne(
            {
                pin: pin,
            },
            {
                $set: {
                    collection: "collected"
                }
            }
        );

        const history = db.collection("history")

        const today = new Date()

        const record = {
            username,
            date: today,
            summaryShort: `The Book ${book.title} is Collected`,
            summaryLong: `${username} Collected the Book '${book.title}' on ${today.toLocaleDateString()}`
        }

        await history.insertOne(record)

        return res.status(200).json({
            message: "User Collected Book Successfully"
        })




    } catch (error) {

        console.log(error)

        return res.status(500).json({
            message: "Internal Server Error"
        })
    }

})


router.post("/return/:pin", async (req, res) => {

    try {

        const pin = req.params.pin

        const db = req.app.locals.db

        const borrows = db.collection("borrows")

        const borrow = await borrows.findOne({
            pin: pin
        })

        if (!borrow) {
            return res.status(400).json({
                message: "Invalid Borrow ID"
            })
        }

        const bookId = borrow.bookId

        const username = borrow.username

        const books = db.collection("books")

        const book = await books.findOne({
            _id: new ObjectId(bookId)
        })

        await books.updateOne(
            {
                _id: new ObjectId(bookId),
            },
            {
                $inc: { availableCopies: 1 }
            }
        );

        await borrows.deleteOne({
            pin: pin
        })

        const history = db.collection("history")

        const today = new Date()

        const record = {
            username,
            date: today,
            summaryShort: `The Book '${book.title}' is Returned.`,
            summaryLong: `The Book'${book.title}' is Returned by ${username} on ${today.toLocaleDateString()}.`
        }

        await history.insertOne(record)

        const borrowRequests = db.collection("borrowRequests")

        await initiateBorrow(books, borrowRequests, borrows, history, bookId)

        return res.status(200).json({
            message: "Book Successfully Returned"
        })


    } catch (error) {

        console.log(error)

        return res.status(500).json({
            message: "Internal Server Error"
        })

    }
})

router.get("/", (req, res) => {
    res.status(200).json(req.user)
})

module.exports = router