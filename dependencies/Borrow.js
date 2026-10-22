const { today, addDays } = require("../services/date")

class Borrow {
    constructor(reserved) {
        this.username = reserved.username
        this.timePeriod = reserved.timePeriod
        this.requested = reserved.requested
        this.accepted = reserved.accepted
        this.toCollect = reserved.toCollect
        this.bookId = reserved.bookId
        this.borrowed = today()
        this.due = addDays(this.borrowed, this.timePeriod)
        this.pin = reserved.pin
        this.status = "borrowed"
    }
}


module.exports = Borrow