const { ObjectId } = require("mongodb");


function checkAuth(roles) {
    return async (req, res, next) => {
        try {

            // Check whether a session exists
            if (!req.session.userId) {
                return res.status(401).json({
                    message: "You are Unauthorized"
                });
            }

            const db = req.app.locals.db;

            // Find the user associated with the session
            const user = await db
                .collection("users")
                .findOne(
                    {
                        _id: new ObjectId(req.session.userId)
                    },
                    {
                        projection: { password: 0 }
                    }
                );

            // User no longer exists
            if (!user) {
                return res.status(401).json({
                    message: "You are Unauthenticated"
                });
            }

            if(!roles.includes(user.role)) {
                return res.status(401).json({
                    message: "You are Unauthorized"
                });
            }

            // Attach user to request
            req.user = user;

            // Continue to the route
            next();

        } catch (error) {

            res.status(500).json({
                message: "Internal Server Occured. Authentication Failed"
            });
        }
    }
}

module.exports = checkAuth