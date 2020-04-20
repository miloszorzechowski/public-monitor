const {QueryProtocol, TeamSpeak, TextMessageTargetMode} = require("ts3-nodejs-library")
const config = require("./config.json")

TeamSpeak.connect({
    protocol: QueryProtocol.SSH,
    password: config.interface.password,
    queryport: config.interface.queryport,
    serverport: config.interface.serverport,
    host: config.interface.host,
    nickname: config.interface.nickname,
    username: config.interface.username
}).then(async TeamSpeak => {
    await Promise.all([
        TeamSpeak.registerEvent("channel", 0)
    ])

    const publicChannels = (await TeamSpeak.channelList())
        .filter((isPublicChannel) => {
            return config.settings.parentPublicChannels.includes(isPublicChannel.pid)
        })
        .map(function(x) {
            return x.cid
        })

    TeamSpeak.on("clientmoved", async ev => {
        try {
            const permitGroupClientList = await TeamSpeak.channelGroupClientList(config.settings.permitChannelGroup, null, ev.client.databaseId)

            if(permitGroupClientList.length > 0) {
                permitGroupClientList.forEach(param => {
                    if(param.cid !== ev.client.cid) {
                        TeamSpeak.setClientChannelGroup(config.settings.guestChannelGroup, param.cid, param.cldbid)
                    }
                })
            }
        } catch(e) {

        }

        if(publicChannels.includes(ev.client.cid)) {
            TeamSpeak.channelList({cid: ev.client.cid}).then(channelInfo => {
                if(channelInfo[0].totalClients === 1) {
                    TeamSpeak.setClientChannelGroup(config.settings.permitChannelGroup, ev.client.cid, ev.client.databaseId)
                    TeamSpeak.sendTextMessage(ev.client.clid, TextMessageTargetMode.CLIENT, config.settings.notificationContent)
                }
            })
        }
    })
}).catch(e => {
    console.error(e)
})