const { body, validationResult } = require("express-validator")

const loginValidation = [
    body("username")
        .notEmpty()
        .withMessage("Username is Required")
        .isLength({ min: 4 })
        .withMessage("Username is Too Short")
        .isLength({ max: 20 })
        .withMessage("Username is Too Long"),

    body("password")
        .notEmpty()
        .withMessage("Password is Required")
        .isLength({ min: 4 })
        .withMessage("Password is Too Short"),
]

const registerValidation = [
    body("username")
        .notEmpty()
        .withMessage("Username is Required")
        .isLength({ min: 4 })
        .withMessage("Username is Too Short")
        .isLength({ max: 20 })
        .withMessage("Username is Too Long"),
    body("password")
        .notEmpty()
        .withMessage("Password is Required")
        .isLength({ min: 4 })
        .withMessage("Password is Too Short"),
    body("role")
        .notEmpty()
        .withMessage("Role is Required")
        .isIn(["admin", "member", "librarian"])
        .withMessage("Invalid Role is Selected")

]

function requestValidation(req, res, next) {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }

    next()
}


module.exports = {
    loginValidation,
    registerValidation,
    requestValidation
}