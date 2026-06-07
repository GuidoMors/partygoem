var express = require('express');
const QRCode = require('qrcode');
const os = require('os');
var http = require('http');
var socketIO = require('socket.io');
var path = require('path');
var fs = require('fs');
const axios = require('axios');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

var GAMES = ['Tetrys'];
var QRCODEDATA;
var URL;
var LOCALIP;
var PUBLICIP;
var PORT;
var PORT_OFFSET = 3000;

//
// THE SETUP
//
setupPartygoem();

async function setupPartygoem() {
    LOCALIP = getLocalIPAddress();
    PORT = convertLocalIpToPORT(LOCALIP);
    console.log("Determined Local IP: " + LOCALIP);
    console.log("Derived Port from Local IP: " + PORT);
    PUBLICIP = await getPublicIPAddress();
    if (!PUBLICIP) {
        console.error('Could not retrieve public IP address.');
        return;
    }
    URL = `http://${PUBLICIP}:${PORT}`;

    bootPartygoemServer(LOCALIP, PUBLICIP, PORT, GAMES);
}

function bootPartygoemServer(LOCALIP, PUBLICIP, PORT, GAMES){
    const ServerController = require('./server.js');
    var gameServer = new ServerController();
    gameServer.run(server, io);
    
    app.set('port', PORT);
    app.use('/static', express.static(__dirname + '/static'));

    const qrCache = new Map();

    for (let game of GAMES) {
        app.get('/'+game, (request, response) => response.sendFile(path.join(__dirname, '/static/'+game+'/'+game+'.html')));
    }
    
    app.get('/qrcode', async (request, response) => {
        try {
            const room = request.query.hash || '';
            const qr = await generateAndCacheQR(room);
            response.json({ src: qr });
        } catch (err) {
            console.error(err);
            response.status(500).json({
                error: 'Could not generate QR code.'
            });
        }
    });

    app.get('/', function(request, response) {
        response.sendFile(path.join(__dirname, 'index.html'));
    });

    app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    server.listen(PORT, async function() {
        console.log('Starting server: ' + PUBLICIP +':'+ PORT);
    });

    async function generateAndCacheQR(room) {
        const key = room || '__default__';

        if (qrCache.has(key)) {
            return qrCache.get(key);
        }

        let fullUrl = URL;

        if (room) {
            fullUrl = `${URL}?room=${encodeURIComponent(room)}`;
        }

        const qrData = await QRCode.toDataURL(fullUrl);

        qrCache.set(key, qrData);

        return qrData;
    }
}


//
// FUNCTIONS
//

async function getPublicIPAddress() {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        return response.data.ip;
    } catch (error) {
        console.error('Error getting public IP address:', error);
        return null;
    }
}

function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (let name of Object.keys(interfaces)) {
        for (let iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith("192")) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

function convertLocalIpToPORT(ip) {
    const segments = ip.split('.');
	var lastsegment = segments[segments.length - 1];
	var portnumber = parseInt(lastsegment) + PORT_OFFSET;
    return portnumber;
}

function getFolderNamesInFolder(relativePath){
	var result= fs.readdirSync(relativePath).filter(function(file) { 
			return fs.statSync(path.join(relativePath, file)).isDirectory(); 
		});			
	return result;
}

// export
module.exports = { GAMES };