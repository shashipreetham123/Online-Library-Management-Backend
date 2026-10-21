const crypto = require("crypto");

function generatePin() {
    return crypto.randomInt(100000, 1000000).toString();
}

async function generateUniquePin(borrows) {
    while (true) {
        const pin = generatePin();

        const exists = await borrows.findOne({ pin });

        if (!exists) {
            return pin;
        }
    }
}

module.exports = generateUniquePin