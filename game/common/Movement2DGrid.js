(function(exports) { 
/**

This component expects the gameController to have ?????
this.gameState.players[i].movement, .direction, .x, .y , .playerHandler, .colW, .colH
for teamDoors: tile can have "teamdoor"=action and progress=teamNr

The following handleComponentSignal's may be sent by this Component:
-

		
**/
var fs = require("fs");
var Tools = require('./../../static/common/tools.js');	
var CommonGameComponent = require('./CommonGameComponent.js');

var DIAGONAL_MOVEMENT_MODIFIER=0.71;


class Movement2DGrid extends CommonGameComponent{


	constructor(gameController, io, gameId, stepSize, ownDoorAttribute ) {  
		super(gameController,  io, gameId);
		//TODO
		this.stepSize=stepSize;
		this.ownDoorAttribute=ownDoorAttribute; // ownDoorAttribute string name of the player attribute that will be used for checking whether the player can pass the door or not, i.e. "team" for teamDoors
		
	}	
	
	defineServerListenersFor(socket){	
		socket.on(this.gameController.gameType+"_updatePlayerMovement"+this.gameId, (movement, userId) => this.updatePlayerMovement(movement, userId));
		socket.on(this.gameController.gameType+"_updatePlayerDirection"+this.gameId, (direction, userId) => this.updatePlayerDirection(direction, userId));
	}

	deleteListeners(){
		this.io.sockets.sockets.forEach(socket => {
			socket.removeAllListeners([this.gameController.gameType+"_updatePlayerMovement"+this.gameId]);
			socket.removeAllListeners([this.gameController.gameType+"_updatePlayerDirection"+this.gameId]);
		});
	}


	
	updatePlayerMovement(movement,userId){
		for(var i=0; i<this.gameController.gameState.players.length;i++){
			if(this.gameController.gameState.players[i].userId==userId){
					this.gameController.gameState.players[i].movement=movement;				
			}
		}
		
	}

	updatePlayerDirection(direction,userId){
		for(var i=0; i<this.gameController.gameState.players.length;i++){
			if(this.gameController.gameState.players[i].userId==userId){
					this.gameController.gameState.players[i].direction=direction;				
			}
		}
		
	}

	movePlayers(stepSizeModifier){
		for(var i=0;i<this.gameController.gameState.players.length;i++){
			if(this.isMoving(this.gameController.gameState.players[i].movement)){
				this.movePlayer(this.gameController.gameState.players[i],stepSizeModifier);
			}
			
		}
	}
	
	isMoving(movement){
		return (movement.up || movement.down || movement.left || movement.right);

	}
	
	movePlayer(player,stepSizeModifier){
		var stepSize=this.stepSize * stepSizeModifier;
		if(player !== undefined){
			player.direction=player.movement;
			
			var dx = 0;
			var dy = 0;
			
			if (player.movement.left) {
				dy = 0;
				dx = (stepSize * (-1));
				if(player.movement.up ||player.movement.down){
					dx=dx*DIAGONAL_MOVEMENT_MODIFIER;
				}
				this.attemptMovement(player.userId, dx, dy);
			}
			
			if (player.movement.up) {
				dx = 0;
			 	dy = (stepSize * (-1));				
				if(player.movement.left ||player.movement.right){
					dy=dy*DIAGONAL_MOVEMENT_MODIFIER;
				}
				this.attemptMovement(player.userId, dx, dy);
			}
			if (player.movement.right) {
				dy = 0;
			  	dx = stepSize;
				if(player.movement.up ||player.movement.down){
					dx=dx*DIAGONAL_MOVEMENT_MODIFIER;
				}	 
				this.attemptMovement(player.userId, dx, dy);
			}
			if (player.movement.down) {
				dx = 0
			 	dy=stepSize;
				if(player.movement.left ||player.movement.right){
					dy=dy*DIAGONAL_MOVEMENT_MODIFIER;
				}
				this.attemptMovement(player.userId, dx, dy);

			}		
		
		}
	}

	attemptMovement(userId, dx, dy) {

		this.changePlayerPos(userId, dx,dy);
		var collisionObjects=this.isColliding(userId);
		if(collisionObjects.length>0){
			this.changePlayerPos(userId, (dx*(-0.8)),(dy*(-0.8)));
			var collisionObjects=this.isColliding(userId);
			if(collisionObjects.length>0){
				this.changePlayerPos(userId, (dx*(-0.2)),(dy*(-0.2)));
			}
			this.doOnCollision(userId,collisionObjects);
		}
		else{
			this.doOnSuccessfulMovement(userId);
		}

	}

	doOnCollision(userId, collisionObjects){
		this.gameController.handleComponentSignal({source:this, sourceClass: this.constructor.name, type:"playerCollided", target:{userId: userId, collisionObjects:collisionObjects}});
	}

	doOnSuccessfulMovement(userId){
		this.gameController.handleComponentSignal({source:this, sourceClass: this.constructor.name, type:"playerMoved", target:userId});
	}
	
	changePlayerPos(userId, dx, dy){
		var player=this.gameController.playerHandler.getPlayerByUserId(userId);
		player.x= player.x + dx;
		player.y= player.y + dy;

	}
	
	isColliding(userId){
		var collisionsTile=this.isCollidingWithTile(userId);
		var collisionsPlayer=this.isCollidingWithPlayer(userId);
		var collisionObjects=collisionsTile.concat(collisionsPlayer);
		return collisionObjects;
	}




	
	isCollidingWithTile(userId){
		
		var collisionObjects=[];
		var player= this.gameController.playerHandler.getPlayerByUserId(userId);
		
		var upperLeftX = player.x - (player.colW/2);
		var upperLeftY = player.y - player.colH;
		var playerW=player.colW;
		var playerH=player.colH;
		
		var tileUpperLeft=this.gameController.mapHandler.getTileAtPoint(upperLeftX, upperLeftY);
		var tileUpperRight=this.gameController.mapHandler.getTileAtPoint(upperLeftX+playerW,upperLeftY);
		var tileLowerLeft=this.gameController.mapHandler.getTileAtPoint(upperLeftX,upperLeftY+playerH);
		var tileLowerRight=this.gameController.mapHandler.getTileAtPoint(upperLeftX+playerW,upperLeftY+playerH);
		
		var isCollidingUpperLeft=(	tileUpperLeft == undefined || tileUpperLeft.isBlocking || this.isBlockingDoor(tileUpperLeft, player[this.ownDoorAttribute]));
		var isCollidingUpperRight=(		tileUpperRight == undefined || tileUpperRight.isBlocking || this.isBlockingDoor(tileUpperRight, player[this.ownDoorAttribute]));
		var isCollidingLowerLeft=(tileLowerLeft == undefined || tileLowerLeft.isBlocking || this.isBlockingDoor(tileLowerLeft, player[this.ownDoorAttribute]));
		var isCollidingLowerRight=(tileLowerRight == undefined || tileLowerRight.isBlocking || this.isBlockingDoor(tileLowerRight, player[this.ownDoorAttribute]));
		
		if(isCollidingUpperLeft){
			var collisionObject={collider: userId, direction: player.direction, isTile:true, collidedWith: tileUpperLeft, x:upperLeftX, y:upperLeftY };
			collisionObjects.push(collisionObject);
		}
		if(isCollidingUpperRight){
			var collisionObject={collider: userId, direction: player.direction, isTile:true, collidedWith: tileUpperRight, x:upperLeftX+playerW, y:upperLeftY };
			collisionObjects.push(collisionObject);
		}	
		if(isCollidingLowerLeft){
			var collisionObject={collider: userId, direction: player.direction, isTile:true, collidedWith: tileLowerLeft, x:upperLeftX, y:upperLeftY+playerH };
			collisionObjects.push(collisionObject);
		}	
		if(isCollidingLowerRight){
			var collisionObject={collider: userId, direction: player.direction, isTile:true, collidedWith: tileLowerRight, x:upperLeftX+playerW, y:upperLeftY+playerH };
			collisionObjects.push(collisionObject);
		}
		return collisionObjects;
		
	}

	
	isBlockingDoor(tile, teamnr ){
		if (tile.action != "teamdoor"){
			return false;
		}
		if (tile.progress == teamnr){
			return false;
		}
		return true;
	}
	
	isCollidingWithPlayer(userId){
		var collisionObjects=[];
		var player= this.gameController.playerHandler.getPlayerByUserId(userId);
		
		var upperLeftX = player.x - (player.colW/2);
		var upperLeftY = player.y - player.colH;
		var playerW=player.colW;
		var playerH=player.colH;
		
		
		for(var i=0; i< this.gameController.gameState.players.length;i++){
			
			var otherPlayer=this.gameController.gameState.players[i];
			if(otherPlayer.userId!=userId){
				var otherX = otherPlayer.x - (otherPlayer.colW/2);
				var otherY = otherPlayer.y - otherPlayer.colH;

				var otherW=otherPlayer.colW;
				var otherH=otherPlayer.colH;
				
				var isColliding=Tools.isCollisionCorner(upperLeftX,upperLeftY,playerW, playerH, otherX, otherY, otherW, otherH);
				if(isColliding!=undefined){	
					var collisionObject={collider: userId, direction: player.direction, isTile:false, collidedWith: otherPlayer.userId, x:isColliding.x, y:isColliding.y};
					collisionObjects.push(collisionObject);
					return collisionObjects;
				}
			}
	
		}
		return collisionObjects;
		
	}


}


module.exports = Movement2DGrid;
     
})(typeof exports === 'undefined'?  
            window: exports); 