module.exports = {
    development:{
        env: '开发环境',
        LOCAL_PORT: 18080,//反向代理服务监听
        REMOTE_PORT: 1883,//反向代理远程服务器，部署线上之后，1883要禁止外网访问只开放8883端口tls链接、8084端口wss链接
        REMOTE_HOST: "emq.qqty.com",////反向代理地址
    },
    production:{
        env: '生产环境',
        LOCAL_PORT: 18080,
        REMOTE_PORT: 1883,
        REMOTE_HOST: "emq.qqty.com",
    }
}
