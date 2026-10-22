const express = require("express")
const Borrow = require("../dependencies/Borrow")
const processRequests = require("../services/process-requests")
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

        const borrow = new Borrow(reserved.toObject())

        await BorrowsCollection.insertOne(borrow)

        return res.status(200).json({
            message: "Book Collected Successfully",
            data: borrow
        })

    } catch (error) {
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

        const accepted = await processRequests(ReservesCollection, BorrowRequestsCollection, BorrowsCollection, BooksCollection, bookId)

        if (accepted) {
            return res.status(200).json({
                message: "Book Returned and Reserved for Next Member"
            })
        }

        return res.status(200).json({
            message: "Book Returned Successfully",
            data: borrow
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