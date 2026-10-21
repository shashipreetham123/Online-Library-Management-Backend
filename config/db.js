const { MongoClient } = require("mongodb")

const uri = process.env.MONGODB_URI

const client = new MongoClient(uri)

const dbname = process.env.DB_NAME

async function connectDB() {
    try {
        await client.connect()

        const db = client.db(dbname)

        await db
            .collection("users")
            .createIndex(
                { username: 1 },
                { unique: true }
            );

        return db

    } catch (error) {

        throw error
    }
}

module.exports = connectDB