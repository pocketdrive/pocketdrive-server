/**
 * Created by anuradhawick on 7/28/17.
 */
import WebSocket from 'ws';

const ws = new WebSocket('ws://192.248.8.242:8080');

let connected = false;
let dataBuffer = null;
let promise = new Promise(resolve => {
    ws.on('open', () => {
        connected = true;
        resolve();
        console.log('Connected to central server');
    });

    ws.on('close', () => {
        connected = false;
        console.log('closed')
    });

    ws.on('message', (data) => {
        dataBuffer = data;
    });
});

export class Communicator {
    constructor() {
    }

    async connectToCentralServer(username, deviceId) {
        // TODO improve this
        if (!connected) {
            await promise;
        }

        const msg = {
            type: "registerDevice",
            data: {username: username, deviceId: deviceId}
        };

        ws.send(
            JSON.stringify(msg)
        );

        const data = await this.getMessageAsync();
        console.log(data)
    }

    async requestOnlineDevices() {
        if (!connected) {
            await promise;
        }
        const msg = {
            type: "getActiveDevices"
        };

        ws.send(
            JSON.stringify(msg)
        );

        const data = await this.getMessageAsync();
        console.log(data)
    }

    // Asynchronously wait for messages and return a promise on success (data) or failure (null)
    async getMessageAsync() {
        let attemptCount = 0;
        return await new Promise(resolve => {
            const int = setInterval(() => {
                if (dataBuffer !== null) {
                    resolve(dataBuffer);
                    dataBuffer = null;
                    clearInterval(int);
                } else if (attemptCount === 10) {
                    resolve(null);
                    dataBuffer = null;
                    clearInterval(int);
                }
                attemptCount++;
            }, 500);
        });
    }
}