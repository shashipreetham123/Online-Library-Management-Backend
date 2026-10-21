const express = require("express")

const argon2 = require("argon2")

const router = express.Router()

const { loginValidation, registerValidation, requestValidation } = require("../middleware/validation")

router.post("/login", loginValidation, requestValidation, async (req, res) => {
    try {
        const { username, password } = req.body

        const normalizedUsername = username.toLowerCase().trim()

        const db = req.app.locals.db

        const users = db.collection("users")

        const user = await users.findOne({ username: normalizedUsername })

        if (!user) {
            return res.status(404).json({
                message: "User not Found. Authentication Failed",
                data: null
            })
        }

        const isValid = await argon2.verify(user.password, password)

        if (isValid) {

            req.session.userId = user._id.toString();

            return res.status(200).json({
                message: "Login Successful",
                data: {
                    userId: user._id
                }
            })
        } else {
            return res.status(401).json({
                message: "Username or Password is Incorrect. Authentication Failed",
                data: null
            })
        }

    } catch (err) {
        return res.status(500).json({
            message: "Internal Server Error. Authentication Failed",
            data: null
        })
    }
})

router.post("/register", registerValidation, requestValidation, async (req, res) => {
    try {
        const { username, password, role } = req.body

        const db = req.app.locals.db

        const users = db.collection("users")

        const normalizedUsername = username.toLowerCase().trim()

        const exists = await users.findOne({ username: normalizedUsername })

        if (exists) {
            return res.status(400).json({
                message: `User with Username ${normalizedUsername} Already Exists.`,
                data: null
            })
        }

        const hashedPassword = await argon2.hash(password)

        const user = { username: normalizedUsername, password: hashedPassword, role: role }

        await users.insertOne(user)

        return res.status(201).json({
            message: "User Created Successfully",
            data: {
                id: user._id.toString(),
                username
            }
        })

    } catch (error) {

        return res.status(500).json({
            message: "Internal Server Error. Unable to Create User",
            data: null
        })

    }

})

router.post("/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                message: "Logout failed"
            });
        }

        res.clearCookie("connect.sid", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60
        });

        res.json({
            message: "Logged out successfully"
        });
    });
});
module.exports = router