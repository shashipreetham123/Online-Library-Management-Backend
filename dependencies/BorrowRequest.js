const { today, addDays } = require("./date") 

class BorrowRequest {
    constructor(username, bookId, timePeriod) {
        
        this.username = username
        this.timePeriod = timePeriod
        this.bookId = bookId
        this.requested = today()

    }
}

module.exports = BorrowRequest