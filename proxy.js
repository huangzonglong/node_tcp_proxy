/**
 * tcp反向代理
 * net模块官方文档 https://nodejs.org/api/net.html
 * Created by huangzonglong.
 */
var net = require('net');
var uuid = require('uuid').v4();
var Log = require('./log.js');
var Config = require('./config.js')[process.env.NODE_MQTT_ENV || 'development'];
var proxySockets = proxySocketsKeys = [];

function uniqueKey(socket) {
    var key = socket.remoteAddress + ":" + socket.remotePort;
    return key;
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
var tcpProxyServer = net.createServer( function (proxySocket) {//{allowHalfOpen:true},
    // proxySockets.push(proxySocket.remoteAddress + ":" + proxySocket.remotePort);
    var key = proxySocket.remoteAddress + ":" + proxySocket.remotePort;
    proxySockets[key] = proxySocket;
    var context = {
        proxySocket: proxySocket
    };

    proxySocket.on('data', function (msg) {
        //连接复用
        if ((context.serviceSocket != undefined)) {
            context.serviceSocket.write(msg);
        } else {
            context.serviceSocket = new net.Socket();
            //连接代理
            Log.warn("开始连接代理：" + Config.REMOTE_HOST + ':' + Config.REMOTE_PORT);
            context.serviceSocket.connect(parseInt(Config.REMOTE_PORT), Config.REMOTE_HOST, function () {
                var buf = mqttJsonToBuffer();
                Log.warn("连接成功，修改协议 buf数据为：", mqttBufferToString(buf));
                context.serviceSocket.write(buf);
            });

            context.serviceSocket.on("data", function (data) {
                // proxySockets.forEach(function(sc){
                //     console.log(sc)
                //     sc.write(data);
                // });
                context.proxySocket.write(data);
            });

            context.serviceSocket.on('end', function () {
                Log.err(' == serviceSocket disconnected from server\n');
            });

            //服务端连接出问题，断开客户端
            context.serviceSocket.on('error', function (error) {
                Log.err(' == serviceSocket has error \n', error);
                context.proxySocket.destroy();
            });
        }
    });

    context.proxySocket.on('end', function () {
        Log.err('== clientSocket disconnected from server\n');
        var inx = proxySockets.indexOf(proxySocket);
        proxySockets.slice(inx, 1);
        context.serviceSocket.destroy();
    });

    context.proxySocket.on('error', function (error) {
        Log.err('== clientSocket has error : \n', error);
        // var inx = proxySockets.indexOf(proxySocket.remoteAddress + ":" + proxySocket.remotePort);
        // proxySockets.slice(inx, 1);
        delete proxySockets[key];
        console.log(proxySockets.length)
        context.serviceSocket.destroy();
    });

    context.proxySocket.on("close", function (hadError) {
        // var inx = proxySockets.indexOf(proxySocket.remoteAddress + ":" + proxySocket.remotePort);
        // proxySockets.slice(inx, 1);
        delete proxySockets[key];
        context.serviceSocket.destroy();
    });
});

tcpProxyServer.on('error', function (error) {
    Log.err('== tcpProxyServer has error : ', error);
});

//创建反向代理服务
tcpProxyServer.listen(Config.LOCAL_PORT);
Log.warn("成功创建 监听端口: " + Config.LOCAL_PORT);

//300 毫秒检测连接
var periodServerTest = setInterval(function () {
}, 300);
