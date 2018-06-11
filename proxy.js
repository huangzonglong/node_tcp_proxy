/**
 * tcp反向代理
 * net模块官方文档 https://nodejs.org/api/net.html
 * Created by huangzonglong.
 */
var net = require('net');
var uuid = require('uuid').v4();
var Log = require('./log.js');
var Config = require('./config.js')[process.env.NODE_MQTT_ENV || 'development'];
var reConnSec = 300;

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

var pingJson = {"type": "Buffer", "data": [208, 0]};
var pingBuf = new Buffer(pingJson);

Log.warn("服务启动>>>");

/**
 * 创建本地服务，监听connection回调
 */
var tcpProxyServer = net.createServer(function (proxySocket) {
        var clientName = proxySocket.remoteAddress + ":" + proxySocket.remotePort;

        var context = {
            isConnected: false,
            proxySocket: proxySocket
        };

        //优先捕获客户端错误，再进行write，避免异常
        context.proxySocket.on('error', function (error) {
            Log.err('客户端 《' + clientName + '》 异常终止:' + error.errno);
            context.proxySocket.end();//终止当前客户端
            context.serviceSocket.destroy();//销毁当前客户端建立的socket，停止向其发送数据

        });

        //客户端发送数据
        context.proxySocket.on('data', function (msg) {
            if (context.isConnected === true) { //连接复用
                context.serviceSocket.write(msg);
            } else {
                context.serviceSocket = new net.Socket();
                context.isConnected = true;

                //连接emq服务
                Log.warn("connect TO emq server：" + Config.REMOTE_HOST + ':' + Config.REMOTE_PORT);
                context.serviceSocket.connect(parseInt(Config.REMOTE_PORT), Config.REMOTE_HOST, function () {
                    var buf = mqttJsonToBuffer();
                    Log.warn(clientName + " 连接到emq服务器，并写入数据：", mqttBufferToString(buf));
                    context.serviceSocket.write(buf);
                });

                //服务器收到数据时，也往客户端发送数据
                context.serviceSocket.on("data", function (data) {
                    context.proxySocket.write(data);
                });

                //当连接另一侧发送了 FIN 包的时候触发，也关闭当前客户端
                context.serviceSocket.on('end', function () {
                    Log.err('serviceSocket disconnected from server');
                    context.proxySocket.end();
                });

                //服务端连接出问题，断开客户端
                context.serviceSocket.on('error', function (error) {
                    context.serviceSocket.destroy();
                    context.proxySocket.end();
                    context.isConnected = false;

                    Log.err('serviceSocket has error', error);
                });

                //每十秒ping
                // var ping = setInterval(function () {
                //     if(context.isConnected === true){
                //         context.serviceSocket.write(pingBuf);
                //     }
                // }, 10000);

            }
        });

        context.proxySocket.on('end', function () {
            Log.err('客户端 ' + clientName + ' 正常关闭');
            context.serviceSocket.destroy();
            context.isConnected = false;
            context.proxySocket.destroy();
        });

    }
    )
;

tcpProxyServer.on('error', function (error) {
    Log.err('本地服务异常', error);
});

//监听开启的端口
tcpProxyServer.listen(Config.LOCAL_PORT);
Log.warn("Create proxy server , listening: " + Config.LOCAL_PORT);

//300 毫秒检测连接
var periodServerTest = setInterval(function () {
}, reConnSec);
