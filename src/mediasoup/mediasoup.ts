import * as mediasoup from "mediasoup";
import { Router } from "mediasoup/node/lib/RouterTypes";
import { AppData, WebRtcTransportOptions } from "mediasoup/node/lib/types";

export const createWorker = async() => {
    const worker = await mediasoup.createWorker({
        logLevel: 'warn',
        logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    })
    console.log(`worker created: ${worker.pid}`)

    worker.on('died', error => {
        console.log('mediasoup worker has died')
        setTimeout(() => {
            process.exit(1)
        },2000)
    })

    return worker
}

export const createWebRtcTransport = async (callback: any, router: Router<AppData>, sender: boolean) => {
    try {
        const webRtcTransport_options: WebRtcTransportOptions = {
            listenIps: [ {
                ip: '127.0.0.1'
            }],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate: 1000000
        }

        let transport = await router.createWebRtcTransport(webRtcTransport_options)
        console.log(`${sender ? 'producer' : 'consumer'} transport id: ${transport.id}`)

        transport.on('dtlsstatechange', dtlsState => {
            if(dtlsState === 'closed') {
                transport.close()
            }
        })

        transport.on('@close', () => {
            console.log('transport closed')
        })

        callback({
            params: {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters
            }
        })

        return transport
    } catch (error) {
        console.error(error)
        callback({
            params: {
                error: error
            }
        })
    }
}