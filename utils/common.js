import * as jwt from 'jsonwebtoken';
import * as _ from 'lodash';
import * as os from 'os';

/**
 * @author Dulaj Atapattu
 */
export class CommonUtils {

    static authorize(req, res, next) {
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
                    res.sendStatus(401);
                }

            } else {
                res.sendStatus(401);
            }

        } else {
            res.sendStatus(403);
        }
    }

    static getLocalizedPath(normalizedPath) {
        return path.resolve(process.env.PD_FOLDER_PATH, normalizedPath);
    }

    static getNormalizedPath(localizedPath) {
        return _.replace(localizedPath, process.env.PD_FOLDER_PATH, '');
    }

    static getDateTime(){
        return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    }

    static getDeviceName(){
        return os.hostname();
    }

}