/**
 * Created by anuradhawick on 7/29/17.
 */
import PDPeer from './communicator/PDPeer';
import fs from 'fs';
// ./node_modules/.bin/babel-node --presets es2015 peertest.js
async function main() {
    let p1 = new PDPeer(true, 'anu');
    let s1 = await p1.getSignal();

    let p2 = new PDPeer(false, 'wick');
    s1.forEach((s) => {
        "use strict";
        p2.setSignal(s)
    });

    let s2 = await p2.getSignal();
    s2.forEach((s) => {
        "use strict";
        p1.setSignal(s)
    });
    console.log('set signal over');

    let i = setInterval(() => {
        "use strict";
        if (p1.isConnected()) {
            p2.receiveBuffer((buffer, info) => {
                console.log(info)
            });
            p1.sendBuffer(fs.readFileSync('/Users/anuradhawick/Documents/FYP work/peer-demo/B.pdf'));
            clearInterval(i);
        }
    }, 1000);




    // console.log(s1)
    // console.log('set signal')
    // let s2 = await p2.getSignal();
    // console.log(s2)
    //
    // // p1.setSignal(s2);
    // console.log('connected')
    //
    // // console.log(s2)
    // p1.dataReception((data) => {
    //     "use strict";
    //     console.log(data)
    // });
//     setTimeout(() => {
//         "use strict";
//         p2.sendBuffer(new Buffer('anuradha'));
//     }, 2000);
}

main();