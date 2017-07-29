/**
 * Created by anuradhawick on 7/29/17.
 */
import WebSocket from 'ws';

const wss = new WebSocket.Server({port: 7070});


wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log('received: %s', message);
    });
});