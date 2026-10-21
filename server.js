require("./config/env")

const express = require("express")

const checkAuth = require("./middleware/auth")

const app = express()

const session = require("express-session")

const { MongoStore } = require("connect-mongo");

const connectDB = require("./config/db")

const authRoutes = require("./routes/auth-routes")

const userRoutes = require("./routes/user-routes")

const libraryRoutes = require("./routes/library-routes")

const tracker = require("./config/tracker")

const PORT = process.env.PORT

const TRACKER_TIME_INTERVAL = 1000

app.use(express.json())


app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        name: "connect.sid",

        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            dbName: process.env.DB_NAME,
            ttl: 60 * 60
        }),

        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60
        }
    })
);

app.use("/api/auth", authRoutes)

app.use("/api/user", checkAuth("member"), userRoutes)

app.use("/api/library", checkAuth("librarian"), libraryRoutes)

app.get("/", (req, res) => {
    res.send("Authentication Server is Running")
})





async function startServer() {
    try {
        const db = await connectDB()

        let trackerInterval;

        console.log("MongoDB Connected Successfully")

        app.locals.db = db

        app.listen(PORT, () => {
            console.log(`Server Started at http://localhost:${PORT}/`)

            trackerInterval = setInterval(async () => {
                await tracker(db)
            }, TRACKER_TIME_INTERVAL)

        })


    } catch (error) {

        console.error(error)

        console.log("Failed to Start Server")

        process.exit(1)

    }

}

startServer()