function today() {
    return new Date()
}

/**
 * 
 * @param {Date} date 
 * @param {Number} days 
 */

function addDays(date, days) {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() + days)

    return newDate
}

module.exports = {today, addDays}