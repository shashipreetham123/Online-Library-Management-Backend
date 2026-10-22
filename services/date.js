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

function dateTimeString(date) {

    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

module.exports = {today, addDays, dateTimeString}