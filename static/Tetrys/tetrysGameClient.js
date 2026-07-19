/*Script for general client-Side functions*/

/** general VARIABLES**/

var GAME_NAME="Tetrys";
var postGameDrawn = false;
var gameState;
var gameId;
var gameSettings;
var isPlayer=false;
var isHost=false;
var isBusy=true;
var intermediateGameState;
var quickGameState;
//var deviceIsControllerMode = false;




// call the function that runs on loading the page
onLoadInit();

/**
Define Socket Listeners (general)
**/


socket.on(GAME_NAME+"_receiveGameState", function(newGameState, newGameId){
	gameId=newGameId;
	gameState=newGameState;
	isPlayer=isMePlayer();
	isHost=isMeHost();
	socket.emit(GAME_NAME+"_requestGameSettings"+gameId, socket.id);
	socket.emit(GAME_NAME+"_setMeAsControllerMode"+gameId, socket.id, userId, null);
	socket.emit(GAME_NAME+"_requestIntermediateGameState"+gameId, socket.id);

	if (!isHost){
		hideSideMenu();
	}

	if (gameState.isRunning && !isMeHost() && !isMeObserver()) {
		showControllerMode(true);
	} else {
		showControllerMode(false);
	}

	doMoreOnReceiveGameState();
});

socket.on(GAME_NAME+"_receiveGameSettings", function(newGameSettings){
	gameSettings=newGameSettings;

	if (gameState != null && gameState.isRunning ) {
		disableScroll();
	} else {
		enableScroll();
	}

	doMoreOnReceiveGameSettings();

});


socket.on(GAME_NAME+"_receiveIntermediateGameState", function(newIntermediateGameState){
	doOnReceiveIntermediateGameState(newIntermediateGameState);
	
});


socket.on(GAME_NAME+"_receiveQuickGameState", function(newQuickGameState){	
	doOnReceiveQuickGameState(newQuickGameState);
});
	


/**
FUNCTIONS
**/

// function that runs on loading the page
function onLoadInit(){
	setTimeout(function(){//it takes some time to send and receive gamestate so we wait 100 ms
		socket.emit(GAME_NAME+"_requestGameState", socket.id);

	}
	,  100);
}



function doMoreOnReceiveGameSettings(){
	if(gameState.isRunning){
		removeLobby();
		activateSideTab();
	} else {
		drawGameLobby();
	}
	
}

function doMoreOnReceiveGameState(){	
	if (isMeHost()){
		const currentUrl = window.location.href;
		console.log(currentUrl + "?room=" + encodeURIComponent(gameState.hash));
		fetch('/qrcode?hash=' + encodeURIComponent(gameState.hash))
		.then(response => response.json())
		.then(data => {
			var qrDiv = document.getElementById("qrDiv");

			if (qrDiv){
				while (qrDiv.firstChild) {
					qrDiv.removeChild(qrDiv.firstChild);
				}
				
				var img = document.createElement("img");
				img.src = data.src;
				img.alt = "QR Code";
				
				qrDiv.appendChild(img);
			}
		})
	}
	
	for(var i=0; i < gameState.players.length;i++){
		if(gameState.players[i].userId == userId)
		{
			isPlayerReady = gameState.players[i].ready;
		}
	}
}


function getTileById(tileId){
	for(var i=0;i<Object.values(gameState.tiles).length;i++){
			var current=Object.values(gameState.tiles)[i];
			if(current.id==tileId){
				return current;
			}
		}
		return gameState.tiles["none"];
		
	}


function drawStartAnimation(){
	var canvas = document.getElementById('overlayCanvas');
	canvas.width = 1000;
	canvas.height = 1000;
	var context = canvas.getContext('2d');
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = "black";
	if (intermediateGameState.gameTimer < 0) {
		context.globalAlpha = 0;
	} else if (intermediateGameState.gameTimer > 5) {
		context.globalAlpha = 1.0;
	} else {
		context.globalAlpha = 1.0 - 0.2*(intermediateGameState.gameTimer);

	}	
	context.fillRect(0, 0, canvas.width, canvas.height );
	context.globalAlpha = 1.0;

	fontSize = 350;

	if (intermediateGameState.gameTimer >= 2 && intermediateGameState.gameTimer < 5) {
		const themeGreen = getComputedStyle(document.documentElement).getPropertyValue("--themegreen").trim();

		context.fillStyle = 'black';
		context.font = fontSize+'px bigfont';	
		context.fillText((5-intermediateGameState.gameTimer), ((canvas.width-(fontSize/2) )/ 2), ((canvas.height+fontSize)/2));
		
		context.fillStyle = themeGreen;
		context.font = (fontSize-20)+'px bigfont';	
		context.fillText((5-intermediateGameState.gameTimer), ((canvas.width-(fontSize/2) )/ 2)+2, ((canvas.height+fontSize)/2));

	}
}

function drawGamePause(){
	var canvas = document.getElementById('overlayCanvas');
	canvas.width = gameState.map.grid[0].length*gameSettings.tileSizeW;
	canvas.height = gameState.map.grid.length*gameSettings.tileSizeH;
	var context = canvas.getContext('2d');
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = 'green';
	context.font = '48px bigfont';	
	context.fillText("..GAME IS PAUSED..", canvas.width / 4, canvas.height/2);
	
}

function drawPostGame(){
	if (!postGameDrawn){
		activateChatTab();
		postGameDrawn = true;
		deleteGuiElement("postGameScreen");

		var wrapper = document.getElementById("canvasWrapper");
	
		var postgame=document.createElement("div");
		postgame.setAttribute("id","postGameScreen");
		postgame.classList.add("postGameScreen");
	
		wrapper.appendChild(postgame);

		var victoryBar = document.createElement("div");
		victoryBar.classList.add("victoryBar");
		postgame.appendChild(victoryBar);
		victoryBar.innerHTML = "Game Over";

		var scoreContainer = document.createElement("div");
		scoreContainer.setAttribute("id","scoreContainer");
		scoreContainer.classList.add("scoreContainer");
	
		postgame.appendChild(scoreContainer);
		/*
		if (gameState.host==userId) {
			var finishGameButton=document.createElement("button");
			finishGameButton.setAttribute("id","finishGameButton");
			finishGameButton.innerHTML = "Back to Lobby";
			finishGameButton.classList.add("finishGameButton");
			finishGameButton.classList.add("BigButton");
			finishGameButton.addEventListener('click', function(event) {
				finishGame();
			});	
			postgame.appendChild(finishGameButton);	
		}*/


	}

	showControllerMode(false);
}


function doOnReceiveQuickGameState(reducedQuickGameState){
	
	var blockList = [
		{name: "stick", id:"0", coords:[{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:0,y:3}]},
		{name: "cube", id:"1", coords:[{x:0,y:0},{x:1,y:1},{x:0,y:1},{x:1,y:0}]},
		{name: "L", id:"2", coords:[{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:1,y:2}]},
		{name: "P", id:"3", coords:[{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:1,y:0}]},
		{name: "Z", id:"4", coords:[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:2,y:1}]},
		{name: "rZ", id:"5", coords:[{x:2,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]},
		{name: "wasd", id:"6", coords:[{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:1,y:0}]}

	];

	quickGameState = {players: {}};

	for (var i = 0; i < reducedQuickGameState.length; i++){
		if (reducedQuickGameState[i] != null){
			var player = {
				userid: reducedQuickGameState[i][0],
				coords: [],
				direction: reducedQuickGameState[i][2],
				block: {}
			}
			var coords = [];
			for (var j = 0; j < reducedQuickGameState[i][1].length; j++){
				coords.push({x: reducedQuickGameState[i][1][j][0],y: reducedQuickGameState[i][1][j][1]});
			}
			player.coords = coords;
	
			for (var j = 0; j < blockList.length; j++){
				if (reducedQuickGameState[i][3] == blockList[j].name){
					player.block = blockList[j];
				}
			}
	
			quickGameState.players[player.userid] = player;
		}
	}
	clearCanvas();
	if (!isDeviceIsControllerMode()){
		drawMap();	
		drawGameScore();
	}
}


function doOnReceiveIntermediateGameState(l){
	intermediateGameState = {
		gameTimer: l[0],
		gameTime: l[1],
		score: {
			teamScore: {},
			playerScore: {}
		}
	};

	for (var i=0; i < l[2].length; i++){
		tscore = l[2][i];
		if (tscore != null){
			intermediateGameState.score.teamScore[tscore[1]] = {
				won: tscore[0],
				teamNr: tscore[1],
				score: tscore[2],
				blocksPlaced: tscore[3],
				rowsFilled: tscore[4],
				amountFilled:{
					1: tscore[5][0],
					2: tscore[5][1],
					3: tscore[5][2],
					4: tscore[5][3]
				}
			};
		}
	}

	for (var i=0; i < l[3].length; i++){
		score = l[3][i];
		if (score != null){
			intermediateGameState.score.playerScore[i] = {
				userId: score[0],
				won: score[1],
				diedAt: score[2],
				blocksPlaced: score[3],
				rowsFilled: score[4],
				score: score[7],
				amountFilled:{
					1: score[5][0],
					2: score[5][1],
					3: score[5][2],
					4: score[5][3]
				},
				amountBlocksSpawned:{
					stick: score[6][0],
					cube: score [6][1],
					L: score[6][2],
					P: score[6][3],
					Z: score[6][4],
					rZ: score[6][5],
					wasd: score[6][6],
				}
			};
		}
	}

	intermediateGameState.isPaused = l[4];
	intermediateGameState.difficulty = l[5];

	if(intermediateGameState.isPaused){
		drawGamePause();
		
	} else{
		if (intermediateGameState.gameTimer == -1) {
			drawPostGame();
		} 

		showControllerMode(isDeviceIsControllerMode());
		if (!isDeviceIsControllerMode()){
			if (intermediateGameState.gameTimer < 5) {
				postGameDrawn = false;
				drawStartAnimation();
			} else {//if (intermediateGameState.gameTimer-5<3){
				
				clearOverlayCanvas();
			}
		}
			
	}
	//console.log("score "+ JSON.stringify(intermediateGameState.score));
}


function clearOverlayCanvas() {
	var canvas = document.getElementById('overlayCanvas');
	var context = canvas.getContext('2d');
	context.clearRect(0, 0, canvas.width, canvas.height);
}


function clearCanvas() {
	var canvas = document.getElementById('canvas');
	var context = canvas.getContext('2d');
	context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawMap(){
	if (!gameState){ return;}
	var canvas = document.getElementById('canvas');
	var context = canvas.getContext('2d');
	canvas.width = gameState.map.grid[0].length*gameSettings.tileSizeW;
	canvas.height = gameState.map.grid.length*gameSettings.tileSizeH;
	context.font = "bold 12px smallfont";

	var w = gameSettings.tileSizeW;
	var h = gameSettings.tileSizeH;

	
	var borderThickness=2;
	const themeBlack = getComputedStyle(document.documentElement).getPropertyValue("--themeblack").trim();
	var borderColor= themeBlack;

	for(var y=0;y<gameState.map.grid.length;y++){
		for(var x=0;x<gameState.map.grid[y].length;x++){
			var currentBlock=getTileById(gameState.map.grid[y][x]);
			//Border:
			context.fillStyle =borderColor;
			context.fillRect((x*w), (y*h), w, h);
			//Filling:
			context.fillStyle =Tools.RGBToHex(currentBlock.color);
			context.fillRect((x*w)+borderThickness, (y*h)+borderThickness, w-(borderThickness*2), h-(borderThickness*2));
		}
	}
	
	//draw player blocks:
	for(var i=0;i<gameState.players.length;i++){	
		var userId=gameState.players[i].userId;
		for(var j=0;j<quickGameState.players[userId].coords.length;j++){
			var x=quickGameState.players[userId].coords[j].x;
			var y=quickGameState.players[userId].coords[j].y;
			//Border:
			context.fillStyle =borderColor;
			context.fillRect((x*w), (y*h), w, h);
			//Filling:
			context.fillStyle =Tools.RGBToHex(gameState.players[i].selectedCharacter.color);
			context.fillRect((x*w)+borderThickness, (y*h)+borderThickness, w-(borderThickness*2), h-(borderThickness*2));
		}
	}
	
	//draw player name and score:
	
	for(var i=0;i<gameState.players.length;i++){	
		var userId=gameState.players[i].userId;
		var userName=getUserNameById(userId);
		var playerScoreObject = null;
		//console.log(intermediateGameState);
		//console.log(userId + " "+ JSON.stringify( intermediateGameState.score.playerScore));
		//console.log(intermediateGameState.score.playerScore);
		for(var j in Object.keys(intermediateGameState.score.playerScore)){	
		//console.log( (intermediateGameState.score.playerScore[j].userId == userId));
			if(intermediateGameState.score.playerScore[j].userId == userId){
				playerScoreObject=intermediateGameState.score.playerScore[j];
			}
		}
		var userScore =playerScoreObject!=null? playerScoreObject.score : 0;
		var startingPosX = gameState.players[i].startingPos.x;
		context.font = "50px smallfont";
		context.fillStyle = Tools.RGBToHex(gameState.players[i].selectedCharacter.color);
		context.fillText(userName, startingPosX, 50);
		const textWidth = context.measureText(userScore).width;
		context.fillText(userScore, startingPosX + 672 - textWidth, 50);
		
		
	}
		
	var gridH=gameState.map.grid.length;
	var gridW=gameState.map.grid[0].length;

	var windowW=window.innerWidth*0.8;
	var windowH=window.innerHeight;

	var gridRatio= gridW/gridH;
	
	if(gridW/windowW > gridH/windowH){
		canvas.style.width=windowW+"px";
		canvas.style.height=(windowW*(1/gridRatio))+"px";
		canvas.style.marginTop=Math.floor((windowH-(windowW*(1/gridRatio)))/2)+"px";			
	}
	else{
		canvas.style.height=windowH+"px";
		canvas.style.width=(windowH*(gridRatio))+"px";
		canvas.style.marginLeft=Math.floor((windowW-(windowH*(gridRatio)))/2)+"px";
	}
}

function showControllerMode(on){
	var deviceController = document.getElementById("deviceController");
	var right = document.getElementById("right");
	if (deviceController){
		if (on && intermediateGameState && intermediateGameState.gameTimer > -1){
			console.log("display block");
			clearOverlayCanvas();
			clearCanvas();
			deviceController.style.display = "block";

			if (right != null && !right.classList.contains('controllermoderight')){ 
				right.classList.add('controllermoderight');
			}

		} else {
			deviceController.style.display = "none";
			if (right != null && right.classList.contains('controllermoderight')){ 
				right.classList.remove('controllermoderight');
			}
		}
	}
	
	var controllerScoreDiv = document.getElementById("controllerScore");
	if (controllerScoreDiv){
		controllerScoreDiv.innerHTML=""+getMyCurrentScore();
	}
	

	var switcherBoxes = document.querySelectorAll('.controllerSwitcherButton');
	switcherBoxes.forEach(function(checkbox) {
		checkbox.checked = isDeviceIsControllerMode(); 
	});

}

function getMyCurrentScore(){

	if (!intermediateGameState){
		return 0;
	}

		var playerScoreObject = null;
		for(var j in Object.keys(intermediateGameState.score.playerScore)){	
			if(intermediateGameState.score.playerScore[j].userId == userId){
				playerScoreObject=intermediateGameState.score.playerScore[j];
			}
		}
		if (playerScoreObject==null){
			return 0;
		}

		return playerScoreObject.score;
}



function drawGameScore(){
	if (!intermediateGameState || !gameState){ 
		return;
	}

	var gameScore = document.getElementById("gameScore");
	gameScore.innerHTML = "";

	var highestScore = gameState.highScores[0].score;

	if (highestScore > 0){
		var oneHighscoreDiv = document.createElement("div");
		oneHighscoreDiv.innerHTML = `
			<span>HIGHSCORE:</span>
			<br>
			<span>${getUserNameById(gameState.highScores[0].userId)}</span>
			<span>${gameState.highScores[0].score}</span>
		`;
		oneHighscoreDiv.classList.add("firstplace");
		oneHighscoreDiv.classList.add("neonwhite");
		oneHighscoreDiv.classList.add("neonborder");
		gameScore.appendChild(oneHighscoreDiv);
	}

	var playerScores = Object.values(intermediateGameState.score.playerScore);
	playerScores.sort((a, b) => b.score - a.score);

	for (var i=0; i<playerScores.length;i++) {
		var oneHighscoreDiv = document.createElement("div");
		oneHighscoreDiv.innerHTML = `
			<span>${i+1}.</span>
			<span>${getUserNameById(playerScores[i].userId)}</span>
			<span>${playerScores[i].score}</span>
		`;
		for (var j=0; j<gameState.players.length;j++) {
			if (gameState.players[j].userId == playerScores[i].userId){
				var color = Tools.RGBToHex(gameState.players[j].selectedCharacter.color);
				console.log(color);
				oneHighscoreDiv.style.color = color;
			}
		}
		gameScore.appendChild(oneHighscoreDiv);
	}

}

/*
function toggleControllerOption(){
	deviceIsControllerMode = !deviceIsControllerMode;
	if(gameState.isRunning){
		showControllerMode(deviceIsControllerMode);
	}
	console.log("emit _setMeAsControllerMode " + deviceIsControllerMode );
	socket.emit(GAME_NAME+"_setMeAsControllerMode"+gameId, socket.id, userId, deviceIsControllerMode);
}
*/
/*
socket.on(GAME_NAME+"_receiveMeAsController", function(isController){
	console.log("_receiveMeAsController " + isController );
	deviceIsControllerMode = isController;
	showControllerMode(isController);
});
*/


function isDeviceIsControllerMode() {
	//return deviceIsControllerMode;
	return !isMeHost() && !isMeObserver();
}