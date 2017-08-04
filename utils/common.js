import * as jwt from 'jsonwebtoken';

/**
 * @author dulajra
 */
export class CommonUtils {

    static authorize(req, res, next) {
        let bearerToken;
        let bearerHeader = req.headers["authorization"];
        if (typeof bearerHeader !== 'undefined') {
            let bearer = bearerHeader.split(" ");
            bearerToken = bearer[1];

            let token = jwt.verify(bearerToken, process.env.JWT_SECRET);
            req.username = token.username;

            next();
        } else {
            res.sendStatus(403);
        }
    }

}