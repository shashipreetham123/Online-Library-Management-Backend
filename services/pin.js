const crypto = require("crypto");

function generatePin() {
    return crypto.randomInt(100000, 1000000).toString();
}

async function generateUniquePin(BorrowsCollection, ReservesCollection, excludePins = []) {
    while (true) {
        const pin = generatePin();

        const exists1 = await BorrowsCollection.findOne({ pin });

        const exists2 = await ReservesCollection.findOne({ pin })

        const exists3 = excludePins.includes(pin)

        if (!exists1 && !exists2 && !exists3) {
            return pin;
        }
    }
}

async function generateNUniquePins(collection, n) {
    const pins = new Set();

    while (pins.size < n) {
        const pin = await generateUniquePin(collection);
        pins.add(pin);
    }

    return [...pins];
}

module.exports = { generateUniquePin, generateNUniquePins }