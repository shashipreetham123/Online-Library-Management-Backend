const express = require("express")
const Borrow = require("../dependencies/Borrow")
const processRequests = require("../services/process-requests")
const { ObjectId } = require("mongodb")
const { addRecord } = require("../services/history")
const router = express.Router()

router.post("/borrow/:pin", async (req, res) => {
    try {

        const pin = req.params.pin

        const db = req.app.locals.db

        const ReservesCollection = db.collection("Reserves")

        const reserved = await ReservesCollection.findOneAndDelete({ pin })

        if (!reserved) {
            return res.status(400).json({
                message: "Invalid PIN or Book May Already Borrowed"
            })

        }

        const BorrowsCollection = db.collection("Borrows")

        const borrow = new Borrow(reserved)

        await BorrowsCollection.insertOne(borrow)
        const history = await addRecord(db, borrow.bookId, "borrowed", borrow.username, borrow.timePeriod, borrow)

        return res.status(200).json({
            message: "Book Collected Successfully",
            data: borrow,
            history
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

        const BorrowsCollection = db.collection("Borrows")

        const borrow = await BorrowsCollection.findOneAndDelete({ pin })

        if (!borrow) {
            return res.status(400).json({
                message: "Invalid PIN"
            })

        }

        const BooksCollection = db.collection("books")
        const ReservesCollection = db.collection("Reserves")
        const BorrowRequestsCollection = db.collection("BorrowRequests")

        const bookId = borrow.bookId

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

        const accepted = await processRequests(ReservesCollection, BorrowRequestsCollection, BorrowsCollection, BooksCollection, bookId)
        const history = await addRecord(db, bookId, "returned", borrow.username, borrow.timePeriod, borrow)


        if (accepted) {
            return res.status(200).json({
                message: "Book Returned and Reserved for Next Member",
                data: borrow,
                history
            })
        }

        return res.status(200).json({
            message: "Book Returned Successfully",
            data: borrow,
            history
        })

    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }

})

router.get("/", (req, res) => {
    res.status(200).json(req.user)
})

module.exports = router
