import * as jwt from 'jsonwebtoken';

/**
 * @author dulajra
 */
export class CommonUtils {

    static authorize(req, res, next) {
        console.log(req.headers);

        let bearerToken;
        let bearerHeader = req.headers["authorization"];
        if (typeof bearerHeader !== 'undefined') {
            let bearer = bearerHeader.split(" ");

            if (bearer.length > 1) {
                bearerToken = bearer[1];

                try {
                    let token = jwt.verify(bearerToken, process.env.JWT_SECRET);
                    req.username = token.username;
                    next();
                } catch (err) {
                    res.sendStatus(403);
                }

            } else {
                res.sendStatus(403);
            }

        } else {
            res.sendStatus(403);
        }
    }

}