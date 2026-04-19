(function(exports) { 
/**

This component expects the gameController to have this.gameController.gameState.map and getTiles()

The following handleComponentSignal's may be sent by this Component:
-

		
**/
var fs = require("fs");
var Tools = require('./../../static/common/tools.js');	
var CommonGameComponent = require('./CommonGameComponent.js');

var NONE="none";

class MapHandler2DGrid extends CommonGameComponent{


	constructor(gameController, io, gameId, tileSizeW, tileSizeH ) {  
		super(gameController,  io, gameId);
		this.tileSizeW=tileSizeW;
		this.tileSizeH=tileSizeH;
	}	
	
	defineServerListenersFor(socket){	
		//socket.on(this.gameController.gameType+"_attemptPlayerAction"+this.gameId, userId => this.attemptPlayerAction(socket, userId));
	}

	deleteListeners(){
		//this.io.removeAllListeners([this.gameController.gameType+"_attemptPlayerAction"+this.gameId]);
	}



	getStartingPosForPlayerAtCoords(x,y){
		var newX=x*this.tileSizeW + this.tileSizeW/2;
		var newY=y*this.tileSizeH + this.tileSizeH/2 + 5;
		return {x:newX, y:newY};
	}
	
	
	getGridCoordsAt(x,y){
		var tileX=Math.floor(x / this.tileSizeW);
		var tileY=Math.floor(y / this.tileSizeH);
		return {x:tileX,y:tileY};
	}

	getGridCoordsWherePlayerIsLookingAt(userId){
		var player=this.gameController.playerHandler.getPlayerByUserId(userId);

		if (player == null) { return; }

		var direction=player.direction;

		var xOffset = this.tileSizeW/1.1;
		var yOffset = this.tileSizeH/1.1;

		var tileSpotX=player.x;
		var tileSpotY=player.y-(this.gameController.gameSettings.playerHandsHeightModifier/2);
		
		if(direction.up && !direction.down){
			tileSpotY = tileSpotY - yOffset;
		}

		if(direction.down && !direction.up){
			tileSpotY = tileSpotY + yOffset;
		}

		if(direction.right && !direction.left){
			tileSpotX = tileSpotX + xOffset;
		}

		if(direction.left && !direction.right){
			tileSpotX = tileSpotX - xOffset;
		}

		var tileX=Math.floor(tileSpotX/ this.tileSizeW);
		var tileY=Math.floor(tileSpotY/ this.tileSizeH);
		return {x:tileX,y:tileY};
	}
	
	
	// getGridCoordsWherePlayerIsLookingAt(userId){
	// 	var player=this.gameController.playerHandler.getPlayerByUserId(userId);

	// 	if (player == null) { return; }

	// 	var direction=player.direction;

	// 	var playerX=player.x;
	// 	var playerY=player.y;
		
	// 	var xOffset = this.tileSizeW;
	// 	var yOffset = this.tileSizeH;

	// 	if(direction.up && !direction.down){
	// 		var tile = this.getTileAtPoint(playerX, playerY-yOffset);
	// 		if (tile.isBlocking){
	// 			var tileX=Math.floor(playerX/ this.tileSizeW);
	// 			var tileY=Math.floor((playerY-yOffset)/ this.tileSizeH);
	// 			return {x:tileX,y:tileY};
	// 		}
	// 	}
	// 	if(direction.down && !direction.up){
	// 		var tile = this.getTileAtPoint(playerX, playerY+yOffset);
	// 		if (tile.isBlocking){
	// 			var tileX=Math.floor(playerX/ this.tileSizeW);
	// 			var tileY=Math.floor((playerY+yOffset)/ this.tileSizeH);
	// 			return {x:tileX,y:tileY};
	// 		}
	// 	}
	// 	if(direction.right && !direction.left){
	// 		var tile = this.getTileAtPoint(playerX+xOffset, playerY);
	// 		if (tile.isBlocking){
	// 			var tileX=Math.floor((playerX+xOffset)/ this.tileSizeW);
	// 			var tileY=Math.floor(playerY/ this.tileSizeH);
	// 			return {x:tileX,y:tileY};
	// 		}
	// 	}
	// 	if(direction.left && !direction.right){
	// 		var tile = this.getTileAtPoint(playerX-xOffset, playerY);
	// 		if (tile.isBlocking){
	// 			var tileX=Math.floor((playerX-xOffset)/ this.tileSizeW);
	// 			var tileY=Math.floor(playerY/ this.tileSizeH);
	// 			return {x:tileX,y:tileY};
	// 		}
	// 	}

	// 	if(direction.up && !direction.down){
	// 		var tile = this.getTileAtPoint(playerX, playerY-yOffset);

	// 		var tileX=Math.floor(playerX/ this.tileSizeW);
	// 		var tileY=Math.floor((playerY-yOffset)/ this.tileSizeH);
	// 		return {x:tileX,y:tileY};
	// 	}
	// 	if(direction.down && !direction.up){
	// 		var tile = this.getTileAtPoint(playerX, playerY+yOffset);

	// 		var tileX=Math.floor(playerX/ this.tileSizeW);
	// 		var tileY=Math.floor((playerY+yOffset)/ this.tileSizeH);
	// 		return {x:tileX,y:tileY};
	// 	}
	// 	if(direction.right && !direction.left){
	// 		var tile = this.getTileAtPoint(playerX+xOffset, playerY);

	// 		var tileX=Math.floor((playerX+xOffset)/ this.tileSizeW);
	// 		var tileY=Math.floor(playerY/ this.tileSizeH);
	// 		return {x:tileX,y:tileY};
	// 	}
	// 	if(direction.left && !direction.right){
	// 		var tile = this.getTileAtPoint(playerX-xOffset, playerY);

	// 		var tileX=Math.floor((playerX-xOffset)/ this.tileSizeW);
	// 		var tileY=Math.floor(playerY/ this.tileSizeH);
	// 		return {x:tileX,y:tileY};
	// 	}

	// 	var tileX=Math.floor(playerX/ this.tileSizeW);
	// 	var tileY=Math.floor(playerY/ this.tileSizeH);
	// 	return {x:tileX,y:tileY};	
	// }
	
	

	/**
	Function that takes a position x,y as input and determines the tile at that position on the grid.
	**/
	getTileAtPoint(x,y){
		
		var tX= Math.floor(x / this.tileSizeW);
		var tY= Math.floor(y /this.tileSizeH);

		if(tY <0 || tY > (this.gameController.gameState.map.grid.length-1) || tX<0 || tX > (this.gameController.gameState.map.grid[0].length-1)){
				return this.gameController.getTiles()[NONE];
		}
		var tileId=this.gameController.gameState.map.grid[tY][tX];
		var tile= Object.values(this.gameController.getTiles())[tileId];
		return tile;
		
	}
		
	
	
	isFloorTile(tile){
		return tile.name.includes("floor");
		
	}

	getTileWherePlayerIsLookingAt(userId){
		var gridCoords=this.getGridCoordsWherePlayerIsLookingAt(userId);
		
		if(gridCoords.y <0 	|| gridCoords.x <0
		|| gridCoords.y >= this.gameController.gameState.map.grid.length || gridCoords.x >=this.gameController.gameState.map.grid[0].length) {
			return this.gameController.getTiles()[NONE];
		}
		else{		
			var tileId=this.gameController.gameState.map.grid[gridCoords.y][gridCoords.x];
			var tile=Object.values(this.gameController.getTiles())[tileId];
			return tile;
		}
	}
	

}


module.exports = MapHandler2DGrid;
     
})(typeof exports === 'undefined'?  
            window: exports); 