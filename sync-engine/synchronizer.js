/**
 * Created by anuradhawick on 7/28/17.
 */
import fs from 'fs';
import * as _ from 'lodash';
import uuid from 'uuid/v4';
import cmd from 'node-cmd';

export class Synchronizer {

    async getChunks(filename) {
        let hashFilename = `${uuid()}`;
        await new Promise((resolve) => {
            cmd.get(
                `./node_modules/.bin/rabin "${filename}" \
                --bits=8 --min=512 --max=65536 > \
                ./${hashFilename}`,
                () => resolve()
            );
        });

        let file = fs.readFileSync(`./${hashFilename}`);
        let out = file.toString();
        fs.unlink(`./${hashFilename}`, () => {
        });

        try {
            return _.map(_.trim(out).split('\n'), (val) => {
                return JSON.parse(val)
            });
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    async getTransmissionData(oldFileChunks, newFileChunks, newFileBuffer) {
        let cs = oldFileChunks;
        let cs_new = newFileChunks;
        let new_file = newFileBuffer;
        let old_data = [];
        let new_data = [];


        _.each(cs_new, (n) => {
            let matchFound = false;
            _.each(cs, (o) => {
                if (_.isEqual(o.hash, n.hash)) {
                    // no need to update [new offset, previous offset, length]
                    old_data.push([n.offset, o.offset, n.length]);
                    matchFound = true;
                    return false;
                }
            });
            // if no match found
            if (!matchFound) {
                // need to update [new offset, new data]
                new_data.push([n.offset, new_file.slice(n.offset, n.offset + n.length)]);
            }
        });

        return {oldData: old_data, newData: new_data};
    }

    async updateOldFile(transmissionData, oldFilePath) {
        // TODO must be implemented as a C++ wrapper for performance
        let out = new Buffer(0);
        let existing_file = fs.readFileSync(`${oldFilePath}`);
        let old_data = transmissionData.oldData;
        let new_data = transmissionData.newData;

        // merge changes to the new file
        while (old_data.length > 0 || new_data.length > 0) {
            // if there's data in both arrays
            if (old_data.length > 0 && new_data.length > 0) {
                // get the earliest buffer
                if (old_data[0][0] < new_data[0][0]) {
                    let oldChunk = old_data.shift();
                    out = Buffer.concat([out, existing_file.slice(oldChunk[1], oldChunk[1] + oldChunk[2])]);
                } else {
                    let newChunk = new_data.shift();
                    out = Buffer.concat([out, newChunk[1]]);
                }
            } else if (old_data.length === 0) {
                let newChunk = new_data.shift();
                out = Buffer.concat([out, newChunk[1]]);
            } else if (new_data.length === 0) {
                let oldChunk = old_data.shift();

                out = Buffer.concat([out, existing_file.slice(oldChunk[1], oldChunk[1] + oldChunk[2])]);
            }
        }
        console.log(out.byteLength, existing_file.byteLength);
        fs.writeFileSync(`${oldFilePath}`, out)
    }
}