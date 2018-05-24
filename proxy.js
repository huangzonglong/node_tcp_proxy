/**
 * tcp反向代理
 * net模块官方文档 https://nodejs.org/api/net.html
 * Created by zhuangjiesen on 2017/12/7.
 */
var net = require('net');
var uuid = require('uuid').v4();
var Log = require('./log.js');

var proxyConfig = {
    LOCAL_PORT: 10241,//反向代理服务监听
    REMOTE_PORT: 1883,//反向代理远程服务器
    REMOTE_HOST: "192.168.1.246",//反向代理地址
}

function targetServer() {
    this.host;
    this.port;
}

var targetServerList = [];
var targetServer = new targetServer();
targetServer.port = proxyConfig.REMOTE_PORT;
targetServer.host = proxyConfig.REMOTE_HOST;
targetServerList.push(targetServer);

function getServer() {
    return targetServerList[0];
}

/**
 * 组装mqtt连接数据 buffer
 * @returns {Buffer}
 */
function mqttJsonToBuffer() {
    var timestamp = new Date().getTime();
    var clientId = '1' + uuid + timestamp;

    var acsii1 = [16, 109, 0, 4, 77, 81, 84, 84, 4, 194, 0, 0, 0];

    var clientIdBuf = new Buffer(clientId);
    var jsonClientIdBuf = JSON.stringify(clientIdBuf);

    var jsonC = JSON.parse(jsonClientIdBuf);
    var dataBuf = acsii1.concat(jsonC['data']);

    var acsii2 = [0, 22, 109, 113, 116, 116, 95, 97, 112, 112, 99,
        108, 105, 101, 110, 116, 95, 110, 111, 108, 111, 103, 105,
        110, 0, 22, 109, 113, 116, 116, 95, 97, 112, 112, 99, 108,
        105, 101, 110, 116, 95, 110, 111, 108, 111, 103, 105, 110
    ];

    dataBuf = dataBuf.concat(acsii2);
    var jParse = {"type": "Buffer", "data": dataBuf};

    var buf = new Buffer(jParse);

    return buf;
}

/**
 * buffer 转成字符串
 * @param buf
 * @returns {Buffer}
 */
function mqttBufferToString(buf) {
    return (new Buffer(JSON.parse(JSON.stringify(buf)))).toString();
}

Log.warn("服务启动中...");

/**
 * 代理
 */
var tcpProxyServer = net.createServer(function (clientSocket) {
    clientSocket.on('data', function (msg) {
        //连接复用
        var serviceSocket = null;
        if ((serviceSocket = clientSocket.serviceSocket)) {
            serviceSocket.write(msg);
        } else {
            var serviceSocket = new net.Socket();
            clientSocket.serviceSocket = serviceSocket;
            //连接代理
            serviceSocket.connect(parseInt(getServer().port), getServer().host, function () {
                var buf = mqttJsonToBuffer();
                Log.warn("收到连接请求，修改buf数据为：", mqttBufferToString(buf));
                serviceSocket.write(buf);
            });

            serviceSocket.on("data", function (data) {
                Log.warn("收到tcp服务端数据...", data);
                clientSocket.write(data);
            });

            serviceSocket.on('end', function () {
                Log.err(' == serviceSocket disconnected from server\n', err);
            });

            //服务端连接出问题，断开客户端
            serviceSocket.on('error', function (err) {
                Log.err(' == serviceSocket has error \n', err);
                clientSocket.end();
            });
        }
    });
    clientSocket.on('end', function () {
        Log.err('== clientSocket disconnected from server\n');
    });

    clientSocket.on('error', function (err) {
        Log.err('== clientSocket has error : \n', err);
    });
});

tcpProxyServer.on('error', function (error) {
    Log.err('== tcpProxyServer has error : ', err);
});

//创建反向代理服务
tcpProxyServer.listen(proxyConfig.LOCAL_PORT);
Log.warn("监听端口: " + proxyConfig.LOCAL_PORT);
Log.warn("成功创建代理服务！！");

//300 毫秒检测连接
var periodServerTest = setInterval(function () {
}, 300);
