/**
 * Created by anuradhawick on 7/28/17.
 */
import WebSocket from 'ws';
import * as _ from 'lodash';

import {centralServer, centralServerWSPort} from '../config';
import * as wsm from './ws-messages';
import PDPeer from './pd-peer';
import PeerCommunicator from './peer-communicator';
import FileExplorer from '../web-file-explorer-backend/file-explorer';

const ws = new WebSocket(`ws://${centralServer}:${centralServerWSPort}`);
const sampleMessage = {type: ''};

export class Communicator {
    promise;
    connected;
    eventBuffer;

    constructor() {
        this.connected = false;
        this.eventBuffer = {
            getActiveDevices: null,
            registerDevice: null
        };
        this.promise = new Promise(resolve => {
            ws.on('open', () => {
                this.connected = true;
                resolve();
                console.log('Connected to central server');
            });

            ws.on('close', () => {
                this.connected = false;
                console.log('closed')
            });

            ws.on('message', (data) => {
                let obj = JSON.parse(data);

                switch (obj.type) {
                    case wsm.getActiveDevices:
                        this.eventBuffer.getActiveDevices = data;
                        break;
                    case wsm.registerDevice:
                        this.eventBuffer.registerDevice = data;
                        break;
                    case wsm.connectionOffer:
                        this.createPeerForSending(obj);
                        break;
                    case wsm.webConsoleRelay:
                        this.performWebConsoleTask(obj, ws);
                        break;
                }
            });
        });
    }

    async createPeerForSending(data) {
        let pdpeer = new PDPeer();
        let signals = data.offer;
        let answerMessage = _.clone(sampleMessage);

        _.each(signals, (signal) => {
            pdpeer.setSignal(signal);
        });

        signals = await pdpeer.getSignal();
        answerMessage.type = wsm.acceptOffer;
        answerMessage.data = {
            acceptedUsername: data.fromUsername,
            acceptedDeviceId: data.fromDeviceId,
            answer: signals
        };

        new PeerCommunicator(pdpeer);
        ws.send(JSON.stringify(answerMessage));
    }

    async connectToCentralServer(username, deviceId) {
        // TODO improve this
        if (!this.connected) {
            await this.promise;
        }

        const msg = {
            type: wsm.registerDevice,
            data: {username: username, deviceId: deviceId}
        };

        ws.send(
            JSON.stringify(msg)
        );

        await this.getMessageAsync(wsm.registerDevice);
    }

    async requestOnlineDevices() {
        if (!this.connected) {
            await this.promise;
        }
        const msg = {
            type: wsm.getActiveDevices
        };

        ws.send(
            JSON.stringify(msg)
        );

        // TODO decide what to do with online devices
        const data = await this.getMessageAsync(wsm.getActiveDevices);
    }

    // Asynchronously wait for messages and return a promise on success (data) or failure (null)
    async getMessageAsync(event) {
        let attemptCount = 0;
        return await new Promise(resolve => {
            const int = setInterval(() => {
                if (this.eventBuffer[event] !== null) {
                    resolve(this.eventBuffer[event]);
                    this.eventBuffer[event] = null;
                    clearInterval(int);
                } else if (attemptCount === 10) {
                    resolve(null);
                    this.eventBuffer[event] = null;
                    clearInterval(int);
                }
                attemptCount++;
            }, 500);
        });
    }

    async performWebConsoleTask(obj, ws) {
        console.log(obj);
        const out = _.cloneDeep(sampleMessage);
        switch (obj.message.message.action) {
            case 'list':
                out.type = 'webConsoleRelay';
                out['toName'] = obj.message.fromName;
                out['toId'] = obj.message.fromId;
                out['result'] = FileExplorer.list(obj.message.toName, obj.message.message.path).result;
                ws.send(JSON.stringify(out));
                break;
            case 'remove':
                out.type = 'webConsoleRelay';
                out['toName'] = obj.message.fromName;
                out['toId'] = obj.message.fromId;
                out['result'] = FileExplorer.remove(obj.message.toName, obj.message.message.items).result;
                ws.send(JSON.stringify(out));
                break;
            case 'rename':
                out.type = 'webConsoleRelay';
                out['toName'] = obj.message.fromName;
                out['toId'] = obj.message.fromId;
                out['result'] = FileExplorer.rename(
                    obj.message.toName,
                    obj.message.message.item,
                    obj.message.message.newItemPath).result;
                ws.send(JSON.stringify(out));
                break;
            case 'copy':
                out.type = 'webConsoleRelay';
                out['toName'] = obj.message.fromName;
                out['toId'] = obj.message.fromId;
                out['result'] = FileExplorer.copy(
                    obj.message.toName,
                    obj.message.message.items,
                    obj.message.message.newPath,
                    obj.message.message.singleFilename
                ).result;
                ws.send(JSON.stringify(out));
                break;
            case 'move':
                out.type = 'webConsoleRelay';
                out['toName'] = obj.message.fromName;
                out['toId'] = obj.message.fromId;
                out['result'] = FileExplorer.move(
                    obj.message.toName,
                    obj.message.message.items,
                    obj.message.message.newPath,
                ).result;
                ws.send(JSON.stringify(out));
                break;
            case 'createFolder':
                out.type = 'webConsoleRelay';
                out['toName'] = obj.message.fromName;
                out['toId'] = obj.message.fromId;
                out['result'] = FileExplorer.createFolder(
                    obj.message.toName,
                    obj.message.message.newPath
                ).result;
                ws.send(JSON.stringify(out));
                break;
        }
    }
}