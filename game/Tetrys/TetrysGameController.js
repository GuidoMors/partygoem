(function(exports) { 

var CharacterHandler=require("./../common/CharacterHandler.js");
var CommonGameController=require("./../common/CommonGameController.js");
var Tools = require('./../../static/common/tools.js');	
var fs = require("fs");

var GAME_NAME="Tetrys";
var NONE="none";


var TILESIZEWIDTH = 64;
var TILESIZEHEIGHT = 64;


class TetrysGameController extends CommonGameController{

		constructor(gameId, host, gameName, io, server) {  
		super(GAME_NAME, gameId, host, gameName, io, server);
		var defaultCustomCharacter={color:[200,100,0]};
		this.characterHandler=new CharacterHandler(this,io, gameId, defaultCustomCharacter, {});
	

		this.tic = 0;
	
		this.gameState={
			players:[], 
			isRunning:false,
			host:this.gameHost,
			gameId:this.gameId,
			gameType:this.gameType,
			gameName:this.gameName,
			difficulty: 1,
			currentGamePhase:0,
			lastTicTimer: 0,
			map:{id:0, name:"", grid:[[]]}
		};	


		this.intermediateGameState={
			gameTimer:0,
			isPaused:false
		};
		this.quickGameState={
			
		};

			
		this.gameSettings = {
			stepSize: 1, 
			updateTimer: 14, //Fps xd
			baseSpeed:1000,
			speedPerDifficulty:0.20,
			maxDifficulty:8,
			difficultyTimer:40,
			colsPerPlayer: 10,
			tileSizeW: TILESIZEWIDTH, 
			tileSizeH: TILESIZEHEIGHT,
			additionalRowsPerPlayer: 1,
			amountBaseRows: 22,
			movementDelaySize: 3, //the wait in fps before a hold down of the button triggers fast movement
			scoreMultiplierPerDifficulty: 0.2,
			scorePerRows: {1:100, 2:250, 3:400, 4:700}
		};

		this.controllerModeList=[],
		
		this.lastUpdateTime = (new Date()).getTime();
		this.freshVariables();
		
	}	

	//should be called each time you want a fresh game
	freshVariables(){
		this.gameState.isRunning = false;
		this.gameState.difficulty = 1;
		this.gameState.currentGamePhase = 0;
		
		this.quickGameState={players:{}};
	}

	defineServerListenersFor(socket){
		socket.on(this.gameType+"_startGame"+this.gameId, () => this.startGame() );
		socket.on(this.gameType+"_finishGame"+this.gameId, () => this.finishGame() );
		socket.on(this.gameType+"_requestGameState", socketId => this.giveGameStateToSocket(socketId) );
		socket.on(this.gameType+"_requestGameSettings"+this.gameId, socketId => this.giveGameSettingsToSocket(socketId) );
		socket.on(this.gameType+"_requestIntermediateGameState"+this.gameId, socketId => this.refreshIntermediateGameInfo(socketId) );
		socket.on(this.gameType+"_attemptPauseAction"+this.gameId, userId => this.attemptPauseAction(socket, userId));	
		socket.on(this.gameType+"_updatePlayerMovement"+this.gameId, (movement, userId) => this.updatePlayerMovement(movement, userId));
		socket.on(this.gameType+"_attemptPlayerAction"+this.gameId, userId => this.attemptPlayerAction(socket, userId));
		socket.on(this.gameType+"_setMeAsControllerMode"+this.gameId, (socketId, playerId, isController) => this.refreshPlayerAsControllerMode(socketId, playerId, isController));
	}
	
	deleteListeners(){
		this.io.removeAllListeners([this.gameType+"_startGame"+this.gameId]);
		this.io.removeAllListeners([this.gameType+"_finishGame"+this.gameId]);
		this.io.removeAllListeners([this.gameType+"_requestGameState"]);
		this.io.removeAllListeners([this.gameType+"_requestGameSettings"+this.gameId]);
		this.io.removeAllListeners([this.gameType+"_attemptPauseAction"+this.gameId]);
		this.io.removeAllListeners([this.gameType+"_updatePlayerMovement"+this.gameId]);
		this.io.removeAllListeners([this.gameType+"_attemptPlayerAction"+this.gameId]);
		this.io.removeAllListeners([this.gameType+"_setMeAsController"+this.gameId]);
	}
	
	deleteYourself(){
		this.stopGame();
		super.deleteYourself();
	}
	
	refreshQuickGameInfo(){

		var reducedQuickGameState = [];

		for (var i = 0; i < this.gameState.players.length; i++){
			var player = [];		
			var id = this.gameState.players[i].userId;
			player[0] = id;


			var coords = [];

			for (var j = 0; j < this.quickGameState.players[id].coords.length; j++){
				var x = this.quickGameState.players[id].coords[j].x;
				var y = this.quickGameState.players[id].coords[j].y;
				coords.push([x,y]);
			}

			player[1] = coords;
			
			player[2] = this.quickGameState.players[id].direction;

			if (this.quickGameState.players[id].block.type) {
				player[3] = this.quickGameState.players[id].block.type.name;
			} else {
				player[3] = "";
			}
			reducedQuickGameState.push(player);
		}
		this.io.to(this.gameId).emit(this.gameType+"_receiveQuickGameState",reducedQuickGameState);
		
	}

	refreshIntermediateGameInfo(){
		if (!this.gameState.isRunning){return}

		var l = this.intermediateGameState;

		var reduced = [];

		reduced[0] = l.gameTimer;
		reduced[1] = l.gameTime;

		var teamscore = [];
		for (var i = 1; i < this.playerHandler.teams; i++){
			var tscore = l.score.teamScore[i];
			var fill = tscore.amountFilled;
			var amountFilled = [fill[1],fill[2],fill[3],fill[4]];
			teamscore.push([tscore.won, tscore.teamNr, tscore.score, tscore.blocksPlaced, tscore.rowsFilled, amountFilled]);
		}
		reduced[2] = teamscore;

		var playerscore = [];
		for (var i = 0; i < this.gameState.players.length; i++){
			var id = this.gameState.players[i].userId;
			var score = l.score.playerScore[id];
			var fill = score.amountFilled;
			var amountFilled = [fill[1],fill[2],fill[3],fill[4]];
			var blocks = score.amountBlocksSpawned;
			var amountBlocks = [blocks.sticks, blocks.cube, blocks.L, blocks.P, blocks.Z, blocks.rZ, blocks.wasd];
			playerscore.push([score.userId, score.won, score.diedAt, score.blocksPlaced, score.rowsFilled, amountFilled, amountBlocks]);
		}
		reduced[3] = playerscore;
		reduced[4] = l.isPaused;

		this.io.to(this.gameId).emit(this.gameType+"_receiveIntermediateGameState",reduced);
		
	}
	
	
	//"von Oberklasse vererbt"
	doOnIntermediateTimer(){
		this.intermediateGameState.gameTime=this.intermediateGameState.gameTimer;
		
	}
	
	//"von Oberklasse vererbt"
	doOnRunTimer(){
		this.tic++;
		this.checkTic();
		this.checkBlockSpawn();
		this.movePlayers();
		
		if(this.checkGameOver()){
			this.endGame();
		}
		
	}

	movePlayers(){
		for(var i=0;i<this.gameState.players.length;i++){
			if(this.isMoving(this.gameState.players[i].movement) || this.gameState.players[i].facing.left ||this.gameState.players[i].facing.right){
				this.movePlayer(this.gameState.players[i]);
			}
			
		}
		this.lastUpdateTime = (new Date()).getTime();
	}
	
	isMoving(movement){
		return (movement.up || movement.down || movement.left || movement.right);

	}

	checkBlockSpawn(){
		for(var i=0;i<this.gameState.players.length;i++){
			var userId=this.gameState.players[i].userId;
			var canSpawn=this.canSpawnNewBlockForPlayer(userId);
			var shouldSpawn=this.quickGameState.players[userId].block==NONE;
			if(shouldSpawn && canSpawn){
				this.spawnNewRandomBlockForPlayer(userId);
			}
			if(shouldSpawn&& !canSpawn){
				if(this.intermediateGameState.score.playerScore[userId].diedAt <=0){ 
					this.intermediateGameState.score.playerScore[userId].diedAt=this.intermediateGameState.gameTimer;
				}
			}
		}
		
	}
	
	checkGameOver(){
		for(var i=0;i< this.gameState.players.length;i++){
			if(this.canSpawnNewBlockForPlayer(this.gameState.players[i].userId)){
				return false;
			}	
		}
		return true;
		
	}
	
	
	
	checkTic(){
		if(  Math.floor(this.intermediateGameState.gameTimer/this.gameSettings.difficultyTimer  ) > (this.gameState.difficulty)){
			this.gameState.difficulty=( Math.floor(this.intermediateGameState.gameTimer / this.gameSettings.difficultyTimer) );
		}
		var currentTime = (new Date()).getTime();
		var timeDifference = currentTime - this.gameSettings.lastTicTimer;
		var limit=this.gameSettings.baseSpeed * Math.pow((1-this.gameSettings.speedPerDifficulty), this.gameState.difficulty );
		if(timeDifference>limit){
			this.gameSettings.lastTicTimer=currentTime;
			for(var i=0;i< this.gameState.players.length;i++){
				var player=this.gameState.players[i];
              //  if(!player.movement.down){
                    this.attemptMovement(player.userId, 0, this.gameSettings.stepSize);	
				//}

			}
		}
		
		
	}

	doOnStartGame(){
		this.initTiles();
        
		this.initMap();
		this.gameState.players=this.playerHandler.getPlayersOrderedByTeam();
		this.initializeStatistics();
		
		for(var i=0;i<this.gameState.players.length;i++){
			var userId=this.gameState.players[i].userId;
			this.gameState.players[i].playerNumber=i;	
			this.gameState.players[i].movement={up: false, down: false, left: false, right: false};
			this.gameState.players[i].startingPos={};
			this.gameState.players[i].startingPos.x=(this.gameSettings.colsPerPlayer*(i))+(Math.floor((this.gameSettings.colsPerPlayer-4)/2))+1;
			this.gameState.players[i].startingPos.y=1;
			this.gameState.players[i].movementDelay=0;
			this.quickGameState.players[userId]={userId:userId, coords:[], direction:0};
			this.spawnNewRandomBlockForPlayer(userId);
			this.gameSettings.lastTicTimer=(new Date()).getTime();
			
			this.gameState.players[i].facing={};
			this.gameState.players[i].facing.left=false;
			this.gameState.players[i].facing.right=false;
		}
			
	}
	
	initializeStatistics(){
		this.intermediateGameState={ gameTimer:0,gameTime:0, score:{teamScore:{}, playerScore:{}}};
		for (var i=0;i<this.gameState.players.length;i++){
			var userId=this.gameState.players[i].userId;
			this.intermediateGameState.score.playerScore[userId]={userId:this.gameState.players[i].userId, 
																	won:false, 
																	diedAt:0, 
																	blocksPlaced:0, 
																	rowsFilled:0,
																	amountFilled:{1:0, 2:0,3:0,4:0},
																	amountBlocksSpawned:{}
																	};
																	
			for(var j=0;j<Object.values(TetrysGameController.blocks).length;j++){
				var currentBlock=Object.values(TetrysGameController.blocks)[j];
				this.intermediateGameState.score.playerScore[userId].amountBlocksSpawned[currentBlock.name]=0;
			}
		}
		
		for(var i=1;i <this.playerHandler.teams;i++){
			this.intermediateGameState.score.teamScore[i]={won:false, 
															teamNr:i, 
															score:0, 
															blocksPlaced:0,
															rowsFilled:0,
															amountFilled:{1:0, 2:0,3:0,4:0}
															};
		}
	}
	
	spawnNewRandomBlockForPlayer(userId){
		for(var i=0;i<this.gameState.players.length;i++){
			if(this.gameState.players[i].userId==userId){
				this.quickGameState.players[userId].block={};
				this.quickGameState.players[userId].block.type=this.getRandomBlockType();
				this.quickGameState.players[userId].x=this.gameState.players[i].startingPos.x;
				this.quickGameState.players[userId].y=this.gameState.players[i].startingPos.y;
				this.setBlockCoordsForPlayer(userId);
				this.intermediateGameState.score.playerScore[userId].amountBlocksSpawned[this.quickGameState.players[userId].block.type.name]=this.intermediateGameState.score.playerScore[userId].amountBlocksSpawned[this.quickGameState.players[userId].block.type.name]+1;			
			}
		}
	}
	
	setBlockCoordsForPlayer(userId){
		var resultCoords=[];
		if(this.quickGameState.players[userId].block != NONE){
			var rawBlockCoords=this.getBlockCoordsFor(this.quickGameState.players[userId].block.type,this.quickGameState.players[userId].direction);
			for(var j=0;j<rawBlockCoords.length;j++){
				var currentRawCoord=rawBlockCoords[j];
				var currentCoord={};
				currentCoord.x=currentRawCoord.x+this.quickGameState.players[userId].x;
				currentCoord.y=currentRawCoord.y+this.quickGameState.players[userId].y;
				resultCoords.push(currentCoord);
			}
			this.quickGameState.players[userId].coords=resultCoords;
		}
	}
	
	getRandomBlockType(){
		return Tools.getRandomEntryFromList(Object.values(TetrysGameController.blocks));
		
	}
	

	
	
	doOnSuccessfulMovement(userId){
		this.setBlockCoordsForPlayer(userId);
		
	}
	
	doOnCollision(collisionObjects){
		for(var i=0;i<collisionObjects.length;i++){
			if(collisionObjects[i].isTile && collisionObjects[i].direction.down){
				this.mergePlayerWithMap(collisionObjects[i].collider);
				return;
			}
		}

	}
	
	
	getTiles(){
		return this.gameState.tiles;
	}
	
	attemptPlayerAction(socket,userId){
		for(var i=0;i<this.gameState.players.length;i++){
				if(this.gameState.players[i].userId==userId){
					this.quickGameState.players[userId].direction=((this.quickGameState.players[userId].direction+1) %4);
					this.setBlockCoordsForPlayer(userId);
					var collisionObjects=this.isColliding(userId);
					if(collisionObjects.length>0){
						this.quickGameState.players[userId].direction=Math.abs((this.quickGameState.players[userId].direction-1) %4);					
						this.setBlockCoordsForPlayer(userId);
					}
				}
		}	
	}
	
	movePlayer(player){

		if(player.movementDelay>0){
			player.movementDelay--;
			return;
		} else if(player.movementDelay == -1) {
			player.movementDelay = this.gameSettings.movementDelaySize;
		}

		var quickPlayer=this.quickGameState.players[player.userId];

		if(quickPlayer !== undefined){
			
			var dx = 0;
			var dy = 0;
			
			if (player.movement.left || player.facing.left) {
				dy = 0;
				dx = (this.gameSettings.stepSize * (-1));
				this.attemptMovement(player.userId, dx, dy);
			}
		
			if (player.movement.right|| player.facing.right) {
				dy = 0;
				dx = (this.gameSettings.stepSize );
				this.attemptMovement(player.userId, dx, dy);
			}
			if (player.movement.down) {
				dy = (this.gameSettings.stepSize );
				dx = 0;
				this.attemptMovement(player.userId, dx, dy);
			}
            if(player.movement.up){
               this.attemptPlayerAction(this.server.getSocketByUser(player.userId), player.userId)
            }
			player.facing.left=false;
			player.facing.right=false;
		}
	}
	
	changePlayerPos(userId, dx, dy){
		var quickPlayer=this.quickGameState.players[userId];
		quickPlayer.x= quickPlayer.x + dx;
		quickPlayer.y= quickPlayer.y + dy;
		
	}
	
	attemptMovement(userId, dx, dy) {
		this.changePlayerPos(userId, dx,dy);
		this.setBlockCoordsForPlayer(userId);
		var collisionObjects=this.isColliding(userId);
		if(collisionObjects.length>0){
			this.changePlayerPos(userId, (dx*(-1)),(dy*(-1)));
			this.setBlockCoordsForPlayer(userId);
			if(dy>0){
				for(var i=0;i<collisionObjects.length;i++){
					var collisionObject=collisionObjects[i];
					collisionObject.direction.down=true;
				}
				this.doOnCollision(collisionObjects);	
			}
		}
		else{
			this.doOnSuccessfulMovement(userId);
			}

	}

	isColliding(userId){
		if (this.quickGameState.players[userId].block==NONE){
			return [];
		}

		var collisionsTile=this.isCollidingWithTile(userId);
		var collisionsPlayer=this.isCollidingWithPlayer(userId);
		var collisionObjects=collisionsTile.concat(collisionsPlayer);
		return  collisionObjects ;
		
	}
	
	
	isCollidingWithTile(userId){
		var collisionObjects=[];
		var quickPlayer=this.quickGameState.players[userId];
		var player= this.playerHandler.getPlayerByUserId(userId);
		
		for(var i=0;i<quickPlayer.coords.length;i++){
			var currentCoords=quickPlayer.coords[i];
			if(currentCoords.y>0 && currentCoords.y<this.gameState.map.grid.length &&currentCoords.x>0 && currentCoords.x<this.gameState.map.grid[0].length){
				var currentTile=this.getTileById(this.gameState.map.grid[currentCoords.y][currentCoords.x]);
				if(currentTile.isBlocking){
					var collisionObject={collider: userId, direction: JSON.parse(JSON.stringify(player.movement)), isTile:true, collidedWith: currentTile, x:currentCoords.x, y:currentCoords.y };
					collisionObjects.push(collisionObject);
					return collisionObjects;
				}
			}
			else{
				var collisionObject={collider: userId, direction: JSON.parse(JSON.stringify(player.movement)), isTile:true, collidedWith: this.getTiles()["empty"], x:currentCoords.x, y:currentCoords.y };
					collisionObjects.push(collisionObject);
			}
		}
		return collisionObjects;
	}	
	
	
	updatePlayerMovement(movement,userId){
		if (this.intermediateGameState.gameTimer >= 5){
			for(var i=0; i<this.gameState.players.length;i++){
				if(this.gameState.players[i].userId==userId){
					this.gameState.players[i].movementDelay = -1;
					this.gameState.players[i].movement=movement;	
					if(movement.right){
						this.gameState.players[i].facing.right=true;
					}

					if(movement.left){
						this.gameState.players[i].facing.left=true;
					}
				}
			}
		}
	}
	
	
	
	isCollidingWithPlayer(userId){
		var collisionObjects=[];
		var quickPlayer=this.quickGameState.players[userId];
		var player= this.playerHandler.getPlayerByUserId(userId);
		for(var otherp in this.quickGameState.players){
			var other=this.quickGameState.players[otherp];
			if(other != null && other.userId != userId){
				for(var i=0;i<quickPlayer.coords.length;i++){
					for(var j=0;j<other.coords.length;j++){
						if(quickPlayer.coords[i].x==other.coords[j].x &&quickPlayer.coords[i].y==other.coords[j].y){
							var collisionObject={collider: userId, direction: JSON.parse(JSON.stringify(player.movement)), isTile:false, collidedWith:  other.userId, x:quickPlayer.coords[i].x, y:quickPlayer.coords[i].y };
							collisionObjects.push(collisionObject);	
							return collisionObjects;
						}
					}
				}
				
			}
		}
		return collisionObjects;
	}

	mergePlayerWithMap(userId){
		var quickPlayer=this.quickGameState.players[userId];
		var player= this.playerHandler.getPlayerByUserId(userId);
		
		this.intermediateGameState.score.playerScore[userId].blocksPlaced=this.intermediateGameState.score.playerScore[userId].blocksPlaced+1;
		this.intermediateGameState.score.teamScore[this.playerHandler.getTeamOfPlayer(userId)].blocksPlaced=this.intermediateGameState.score.teamScore[this.playerHandler.getTeamOfPlayer(userId)].blocksPlaced+1;
		this.addBlocksToMap(quickPlayer.coords, player.selectedCharacter.color,userId);
	
		this.clearBlockOfPlayer(userId);
		var rowsFilled=this.checkCleanupMap(userId);

		if(rowsFilled>0){
			//rows filled general:
			this.intermediateGameState.score.playerScore[userId].rowsFilled=this.intermediateGameState.score.playerScore[userId].rowsFilled+rowsFilled;
			this.intermediateGameState.score.teamScore[this.playerHandler.getTeamOfPlayer(userId)].rowsFilled=this.intermediateGameState.score.teamScore[this.playerHandler.getTeamOfPlayer(userId)].rowsFilled+rowsFilled;
			
			//rows filled specific:
			this.intermediateGameState.score.playerScore[userId].amountFilled[rowsFilled]=this.intermediateGameState.score.playerScore[userId].amountFilled[rowsFilled]+1;
			this.intermediateGameState.score.teamScore[this.playerHandler.getTeamOfPlayer(userId)].amountFilled[rowsFilled]=this.intermediateGameState.score.teamScore[this.playerHandler.getTeamOfPlayer(userId)].amountFilled[rowsFilled]+1;
			
			//score
			var newScore=this.gameSettings.scorePerRows[rowsFilled] * (1+(this.gameSettings.scoreMultiplierPerDifficulty * (this.gameState.difficulty-1)));
			this.intermediateGameState.score.playerScore[userId].score=this.intermediateGameState.score.playerScore[userId].score+newScore;
			this.intermediateGameState.score.teamScore[this.playerHandler.getTeamOfPlayer(userId)].score=this.intermediateGameState.score.teamScore[this.playerHandler.getTeamOfPlayer(userId)].score+newScore;
			
		}
		
	}
	

	
	
	
	endGame(){

		this.stopGame();
		for(var i=0;i<this.gameState.players.length;i++){
			var userId=this.gameState.players[i].userId;
			var isAlive=this.canSpawnNewBlockForPlayer(userId);
			this.intermediateGameState.score.playerScore[userId].isAlive=isAlive;
		}
		for(var i=1;i< this.playerHandler.teams;i++){
			var teamPlayers=this.playerHandler.getPlayersForTeam(i);
			var hasWon=false;
			for(var j=0;j<teamPlayers.length;j++){
				var currentplayer=teamPlayers[j].userId;
				if(this.intermediateGameState.score.playerScore[currentplayer].isAlive){
					hasWon=true;
				}
			}
			this.intermediateGameState.score.teamScore[i].won=hasWon;
		}
		for(var i=0;i<this.gameState.players.length;i++){
			var userId=this.gameState.players[i].userId;
			this.intermediateGameState.score.playerScore[userId].won=this.intermediateGameState.score.teamScore[this.playerHandler.getTeamOfPlayer(userId)].won;
		}
		
		this.refreshIntermediateGameInfo();
		this.refreshQuickGameInfo();
		this.server.pushLogMessage("Game Over! with a score of !",[],  false, false,this.gameId);		
				
	}
		
	clearBlockOfPlayer(userId){
       for(var i=0;i<this.gameState.players.length;i++){
			if(this.gameState.players[i].userId==userId){
				this.quickGameState.players[userId].block=NONE;
				this.quickGameState.players[userId].x=this.gameState.players[i].startingPos.x;
				this.quickGameState.players[userId].y=this.gameState.players[i].startingPos.y;
				this.setBlockCoordsForPlayer(userId);
			}
		}		
	}
	
	
	canSpawnNewBlockForPlayer(userId){
		for(var i=0;this.gameState.players.length;i++){
			if(this.gameState.players[i].userId==userId){
				var x=this.gameState.players[i].startingPos.x;
				var y=this.gameState.players[i].startingPos.y;
				var tile=this.getTileById(this.gameState.map.grid[y][x]);
				var result=!tile.isBlocking;
				return result;
			}	
		}
	}
	
	
	checkCleanupMap(userId){
		var rowsFilled=0;
		for(var y=1; y<(this.gameState.map.grid.length-1);y++){
			var foundHole=false;
			var minX=this.getMinXForPlayer(userId);
			var maxX=this.getMaxXForPlayer(userId);
			for(var x=minX;x<maxX;x++){
				var tile=this.getTileById(this.gameState.map.grid[y][x]);
				if(!tile.isBlocking){
					foundHole=true;
				}
			}
			if(!foundHole){
				rowsFilled++;
				this.cleanUpRow(y, userId);	
			}
		}
		return rowsFilled;
	}
	
	getMinXForPlayer(userId){
		var minX=0;
        var myTeam=this.playerHandler.getTeamOfPlayer(userId);
        if(myTeam>1){
            minX=this.gameState.teamSeparatorCols[myTeam-1];
        }
	return minX;
	}
	
	getMaxXForPlayer(userId){
		var myTeam=this.playerHandler.getTeamOfPlayer(userId);
        var maxX=this.gameState.teamSeparatorCols[myTeam];
			
		return maxX;
	}
	
	cleanUpRow(y, userId){
        var minX=this.getMinXForPlayer(userId);
		var maxX=this.getMaxXForPlayer(userId);
		for(var x=minX;x<maxX;x++){
			if(this.gameState.map.grid[y][x] >=3){ //playerTile; dont remove actual walls!	
				
				this.gameState.map.grid[y][x]=this.getTiles()["empty"].id;
			}
		}	
		for(var i=(y-1); i>0;i--){
			for(var x=minX;x<maxX;x++){
				if(this.gameState.map.grid[i][x] >=3){
					this.gameState.map.grid[i+1][x]=this.gameState.map.grid[i][x];
					this.gameState.map.grid[i][x]=this.getTiles()["empty"].id;
				}
			}
		}
      this.giveGameStates();
	}
	
	
	
	addBlocksToMap(coords, color, userId){
		var userTile=this.getTiles()[userId];
		for(var i=0;i<coords.length;i++){
			
			this.gameState.map.grid[coords[i].y][coords[i].x]=userTile.id;
			
		}
		this.giveGameStates();
	}
	
	
	
	getBlockCoordsFor(block, direction){
		if(direction==0){
			return block.coords;
		}
		var maxX=0;
		var maxY=0;
		for(var i=0;i<block.coords.length;i++){
			if(block.coords[i].x>maxX){
				maxX=block.coords[i].x;
			}
			if(block.coords[i].y>maxY){
				maxY=block.coords[i].y;
			}
		}
		if(direction==1){
			var coords=[];
			for(var i=0;i<block.coords.length;i++){
				
				var newCoord={};
				newCoord.x=block.coords[i].y;
				newCoord.y=maxX-block.coords[i].x;
				coords.push(newCoord);
			}
		
		return coords;
		}
		if(direction==2){
			var coords=[];
			for(var i=0;i<block.coords.length;i++){
				var newCoord={};
				newCoord.x=maxX-block.coords[i].x;
				newCoord.y=maxY-block.coords[i].y;
				coords.push(newCoord);
			}
		return coords;
		}
		if(direction==3){
			var coords=[];
			for(var i=0;i<block.coords.length;i++){
				var newCoord={};
				newCoord.x=maxY-block.coords[i].y;
				newCoord.y=block.coords[i].x;
				coords.push(newCoord);
			}			
		return coords;
		}
		
	}

	refreshPlayerAsControllerMode(socketId, playerId, isController){

		if(isController == null ){
			if (this.controllerModeList.hasOwnProperty(playerId)) {
				isController = this.controllerModeList[playerId];
			} else {
				isController = false;
			}
		} else {
			this.controllerModeList[playerId] = isController;
		}
		
		this.io.to(socketId).emit(GAME_NAME+"_receiveMeAsController", isController);	
	}
	
	
	
	/**
		every tetrys block consists of 4 blocks. so the max length (width/height) required to spawn is 4 .
		Therefore, for every player, there should be a 4x4 spawn area with a 1x4 separator wall each.
		Thus, amount of cols is 1+ (playerAmount*5)
		Amount Rows should always be the same??
	
	**/
	
	initMap(){
		this.gameState.map={};
		var playerList=this.playerHandler.getPlayersOrderedByTeam();
		var amountPlayers=playerList.length;
		var colsPerPlayer=this.gameSettings.colsPerPlayer;
		var cols=1+colsPerPlayer*amountPlayers;
		var rows=this.gameSettings.amountBaseRows+(amountPlayers-1)*this.gameSettings.additionalRowsPerPlayer;
		this.gameState.map.grid=Tools.createMatrix(cols,rows , this.getTiles()["empty"].id);
		this.gameState.teamSeparatorCols={};
        var wallAfterPlayerNr=0;
        for(var i=1;i<this.playerHandler.teams;i++){
            wallAfterPlayerNr=wallAfterPlayerNr+this.playerHandler.getAmountPlayersForTeam(i);
            this.gameState.teamSeparatorCols[i]=colsPerPlayer*wallAfterPlayerNr;
            
        }
		for (var y=0;y<rows; y++){
				for (var x=0;x<cols; x++){
					var isWall=(y==0 || y==rows-1 || x==0 || x==cols-1);
					var isPlayerWall= (y<=4 && (x%colsPerPlayer)==0 ) ;
					var isTeamSeparator=Object.values(this.gameState.teamSeparatorCols).includes(x);
                    if(isWall || isPlayerWall || isTeamSeparator){
						this.gameState.map.grid[y][x]=this.getTiles()["wall"].id;
					}
					else{
						this.gameState.map.grid[y][x]=this.getTiles()["empty"].id;
					}
				}
		}
		this.gameState.map.cols=cols;
		this.gameState.map.rows=rows;
		this.gameState.map.colsPerPlayer=colsPerPlayer;
	}
	
	
	initTiles(){
		this.gameState.tiles={};
		var noTile={name: NONE, id:0, isBlocking:true, color:[0,0,0]};
		this.gameState.tiles[noTile.name]=noTile;
		
		var wallTile={name: "wall", id:1,  isBlocking:true,  color:[50,50,50]};
		this.gameState.tiles[wallTile.name]=wallTile;
		
		var emptyTile={name: "empty", id:2, isBlocking:false,  color:[200,200,200]};
		this.gameState.tiles[emptyTile.name]=emptyTile;
		
		for(var i=0;i< this.gameState.players.length;i++){
			var player=this.gameState.players[i];
			var playerTile={name: player.userId, id:(3+i), isBlocking:true,  color:player.selectedCharacter.color};
			this.gameState.tiles[playerTile.name]=playerTile;
		}
	}
	
	getTileById(tileId){
		for(var i=0;i<Object.values(this.gameState.tiles).length;i++){
			var current=Object.values(this.gameState.tiles)[i];
			if(current.id==tileId){
				return current;
			}
		}
		return this.gameState.tiles[NONE];
		
	}
	
/**
STATIC PART
**/
	
	static blocks={};

	static tiles={};
	
	static initialize(){
		TetrysGameController.initBlocks();
				
	}
	
	
	static initBlocks(){
		/**
			in a 4x4 field, a block has 4 tiles each that it covers in its starting pos. 
			the starting pos is saved with the block type as a list of 4 coordinates.
			0.1.2.3
		**/
		
		var stick={name: "stick", id:"0", coords:[{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:0,y:3}]};
		TetrysGameController.blocks[stick.name]=stick;
		
		var cube={name: "cube", id:"1", coords:[{x:0,y:0},{x:1,y:1},{x:0,y:1},{x:1,y:0}]};
		TetrysGameController.blocks[cube.name]=cube;
		
		var L={name: "L", id:"2", coords:[{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:1,y:2}]};
		TetrysGameController.blocks[L.name]=L;				
			
		var P={name: "P", id:"3", coords:[{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:1,y:0}]};
		TetrysGameController.blocks[P.name]=P;	
		
		var Z={name: "Z", id:"4", coords:[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:2,y:1}]};
		TetrysGameController.blocks[Z.name]=Z;		
		
		var rZ={name: "rZ", id:"5", coords:[{x:2,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]};
		TetrysGameController.blocks[rZ.name]=rZ;
		
		var wasd={name: "wasd", id:"6", coords:[{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:1,y:0}]};
		TetrysGameController.blocks[wasd.name]=wasd;
	}
	


	
	
	getTeamOfPlayer(userId){
		return this.playerHandler.getTeamOfPlayer(userId);
	}
		

	attemptPauseAction(socket, userId){
		if(this.gameHost==userId){
			if(!this.intermediateGameState.isPaused){
				this.intermediateGameState.isPaused=true;
				this.stopGameTimer();	
				this.refreshIntermediateGameInfo();
				
			}	
			else{
				this.intermediateGameState.isPaused=false;
				this.startGameTimer();	
			}	
		}
	}

	
	
		
		
	startGame(){
		this.doOnStartGame();
		this.lastUpdateTime = (new Date()).getTime();
		this.gameState.isRunning=true;
		this.initiateGameTimer();
		this.giveGameStates();		
		this.refreshIntermediateGameInfo();
		this.refreshQuickGameInfo();
		
		
	}
	
	//actually deletes the game and makes it go back to lobby
	finishGame(){
		this.freshVariables();
		this.giveGameStates();
	}	
	
	//stops the current game and displays the end of game screen
	stopGame(){
		this.stopGameTimer();
		this.intermediateGameState.gameTimer = -1;
	}
	
	
	giveGameStates(){
		this.io.to(this.gameId).emit(this.gameType+"_receiveGameState",this.gameState, this.gameId);	
	}

	giveGameStateToSocket(socketId){
		this.io.to(socketId).emit(this.gameType+"_receiveGameState",this.gameState, this.gameId);	
	}

	giveGameSettingsToSocket(socketId){
		this.gameSettings.teams=this.playerHandler.teams;
		this.io.to(socketId).emit(this.gameType+"_receiveGameSettings",this.gameSettings);	
	}

	
	handleComponentSignal(event){
		if(event.source==this.playerHandler){
			if(event.type=="leavePlayer"){
				
				this.quickGameState.players[event.target] = null;
			}
			if (!this.gameState.isRunning) {
				this.giveGameStates();
			}
		}

				
	}
	
	
	

	

	startGameTimer(){
	
	
		this.gameTimeTimer=setInterval(() => {
			this.intermediateGameState.gameTimer++;
			this.doOnIntermediateTimer();
			this.refreshIntermediateGameInfo();
		},1000);
		

			this.runTimer=setInterval(() => {
				if(this.gameState.isRunning && this.intermediateGameState.gameTimer >= 5){
					this.doOnRunTimer();
					this.refreshQuickGameInfo();
					
				}	
			}, (1000/this.gameSettings.updateTimer) );
	
		
		
	}
	initiateGameTimer(){
	
		this.intermediateGameState.gameTimer=0;
		this.startGameTimer();
		
		
	}
	stopGameTimer(){

		clearInterval(this.runTimer);
		
		clearInterval(this.gameTimeTimer);
	
	}
			
	
}

module.exports = TetrysGameController;
     
})(typeof exports === 'undefined'?  
            window: exports); 