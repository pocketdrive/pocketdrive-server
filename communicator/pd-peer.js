/**
 * Created by anuradhawick on 7/29/17.
 */
import SimplePeer from 'simple-peer';
import * as _ from 'lodash';
import wrtc from 'wrtc';

const options = {
    initiator: false,
    channelConfig: {},
    channelName: 'dvios-intercon',
    config: {
        iceServers: [
            {url: 'stun:stun.l.google.com:19302'},
            {url: 'turn:anuradha@192.248.8.242:3478', username: 'anuradha', credential: 'sanjeewa'}
        ]
    },
    constraints: {},
    offerConstraints: {},
    answerConstraints: {},
    reconnectTimer: false,
    sdpTransform: function (sdp) {
        return sdp
    },
    stream: false,
    trickle: true,
    wrtc: wrtc,
    objectMode: false
};

export default class PDPeer {

    constructor(initiator = false) {
        this.pingReceived = false;
        this.peerObj = null;
        this.connected = false;
        this.callBacks = {
            onMessage: null,
            onDisconnect: null,
            onSignal: null
        };
        this.signalBuffer = [];
        this.dataBuffer = null;
        this.receiveInfo = null;
        this.currentSendProgress = 0;
        this.currentReceiveProgress = 0;

        let optionsCopy = _.cloneDeep(options);
        if (initiator) {
            optionsCopy.initiator = true;
        }

        this.peerObj = new SimplePeer(optionsCopy);

        // signal event
        this.peerObj.on('signal', (data) => {
            this.signalBuffer.push(data);
        });

        // connected event
        this.peerObj.on('connect', () => {
            this.connected = true;
        });


        this.peerObj.on('end', () => {
            console.log('ended')
        });

        // data reception event
        this.peerObj.on('data', (data) => {
            try {
                let obj = JSON.parse(data);
                if (obj.type === 'pong') {
                    this.pingReceived = true;
                }
                // pass down the message
                else if (this.callBacks.onMessage !== null) {
                    this._receiveDataToBuffer(data, false);
                }
            } catch (e) {
                if (this.callBacks.onMessage !== null) {
                    this._receiveDataToBuffer(data, true);
                }
            }
        });
    }

    async sendBuffer(buffer, type = null, data = null) {
        let file = buffer;
        let i = 0;
        let metaObj = {
            sof: true,
            eof: false,
            info: {
                size: file.byteLength
            },
            type: type,
            data: data // To be used at the user level
        };
        this.peerObj.send(JSON.stringify(metaObj));

        while (file.byteLength > 0) {
            this.peerObj.send(file.slice(0, 1024 * 64));
            file = file.slice(1024 * 64);
            i++;
            // For ever 100 chunks wait for ping back to ensure buffer protection
            if (i === 100) {
                this.peerObj.send(JSON.stringify({type: 'ping'}));
                await this._waitForPing();
                i = 0;
            }
            this.currentSendProgress = (1 - file.byteLength / metaObj.info.size) * 100;
        }
        metaObj.eof = true;
        metaObj.sof = false;
        this.peerObj.send(JSON.stringify(metaObj));
        this.currentSendProgress = 0;
    }

    receiveBuffer(callback) {
        this.callBacks.onMessage = callback;
    }

    getCurrentSendProgress() {
        return this.currentSendProgress;
    }

    getCurrentReceiveProgress() {
        return this.currentReceiveProgress;
    }

    async getSignal() {
        let attempts = 0;
        return await new Promise((resolve) => {
            let int = setInterval(() => {
                if (attempts === 10) {
                    resolve(this.signalBuffer);
                    clearInterval(int);
                }
                attempts++;
            }, 100);
        });
    }

    setSignal(signal) {
        this.peerObj.signal(signal)
    }

    isConnected() {
        return this.connected;
    }

    async _waitForPing() {
        let attempts = 0;
        const status = await new Promise((resolve) => {
            let int = setInterval(() => {
                if (this.pingReceived) {
                    this.pingReceived = false;
                    resolve(true);
                    clearInterval(int);
                } else if (attempts === 50) {
                    resolve(false);
                    this.pingReceived = false;
                    clearInterval(int)
                }
                attempts++;
            }, 10);
        });
        return status;
    }

    _receiveDataToBuffer(data, isBuffer) {
        if (!isBuffer) {
            let obj = JSON.parse(data);
            if (obj.sof) {
                this.receiveInfo = {info: obj.info, type: obj.type, data: obj.data};
                this.dataBuffer = new Buffer(0)
            } else if (obj.eof) {
                this.currentReceiveProgress = 0;
                this.callBacks.onMessage(this.dataBuffer, this.receiveInfo);
            } else {
                this.currentReceiveProgress = (this.dataBuffer.byteLength / this.receiveInfo.info.size) * 100;
                this.dataBuffer = Buffer.concat([this.dataBuffer, data]);
            }
        } else {
            this.currentReceiveProgress = (this.dataBuffer.byteLength / this.receiveInfo.info.size) * 100;
            this.dataBuffer = Buffer.concat([this.dataBuffer, data]);
        }
    }
}