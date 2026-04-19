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
    PUBLICIP = await getPublicIPAddress();
    if (!PUBLICIP) {
        console.error('Could not retrieve public IP address.');
        return;
    }
    URL = `http://${PUBLICIP}:${PORT}`;
    QRCODEDATA = await QRCode.toDataURL(URL);
    if (!QRCODEDATA) {
        console.error('Could not make a QR Code.');
        return;
    }
    bootPartygoemServer(LOCALIP, PUBLICIP, PORT, QRCODEDATA, GAMES);
}

function bootPartygoemServer(LOCALIP, PUBLICIP, PORT, QRCODEDATA, GAMES){
    const ServerController = require('./server.js');
    var gameServer = new ServerController();
    gameServer.run(server, io);
    
    app.set('port', PORT);
    app.use('/static', express.static(__dirname + '/static'));

    for (let game of GAMES) {
        app.get('/'+game, (request, response) => response.sendFile(path.join(__dirname, '/static/'+game+'/'+game+'.html')));
    }
    
    app.get('/qrcode', (request, response) => {
        if (!QRCODEDATA) {
            return response.status(500).json({ error: 'QR code not generated yet.' });
        }
        response.json({ src: QRCODEDATA });
    });
    app.get('/', function(request, response) {
        response.sendFile(path.join(__dirname, 'index.html'));
    });

    server.listen(PORT, async function() {
        console.log('Starting server: ' + PUBLICIP +':'+ PORT);
    });
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
            if (iface.family === 'IPv4' && !iface.internal) {
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