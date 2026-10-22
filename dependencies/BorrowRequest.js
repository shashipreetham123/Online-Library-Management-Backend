const { today, addDays } = require("../services/date") 

class BorrowRequest {
    constructor(username, bookId, timePeriod) {
        
        this.username = username
        this.timePeriod = timePeriod
        this.bookId = bookId
        this.requested = today()
        this.status = "requested"

    }
}

module.exports = BorrowRequest