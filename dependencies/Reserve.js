const { today, addDays } = require("../services/date")

class Reserve {
    constructor(request, pin) {
        this.username = request.username
        this.bookId = request.bookId
        this.timePeriod = request.timePeriod
        this.requested = request.requested
        this.status = "reserved"

        this.pin = pin

        this.accepted = today()

        this.toCollect = addDays(this.accepted, 1)
    }
}

module.exports = Reserve