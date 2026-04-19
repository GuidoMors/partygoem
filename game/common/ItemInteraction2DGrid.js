(function(exports) { 
/**

This component expects the gameController to have
this.gameController.gameState.items with {x,y, items:[], tool: , progress: progressType}
getItemTransitions()
getTools()
getIngredients()
gameState.dispensers
this.gameController.gameSettings.playerHandsHeightModifier
this.gameController.gameSettings.playerCollisionWidth; and width

The following handleComponentSignal's may be sent by this Component:
-

		
**/
var fs = require("fs");
var Tools = require('./../../static/common/tools.js');	
var CommonGameComponent = require('./CommonGameComponent.js');
var NONE="none";


class ItemInteraction2DGrid extends CommonGameComponent{


	constructor(gameController, io, gameId , pickupDistance, isToolBased) {  
		super(gameController,  io, gameId);
		this.pickupDistance=pickupDistance;
		this.processingTimers=[];
		this.lastProcessingTimerId=0;
		this.dispenserIndexer = 0;
		this.isToolBased=isToolBased;

	}	
	
	defineServerListenersFor(socket){	
		socket.on(this.gameController.gameType + "_attemptPlayerAction" + this.gameId, (userId, direction) => {
			this.attemptPlayerAction(socket, userId, direction);
		});
	}

	deleteListeners(){
		this.io.removeAllListeners([this.gameController.gameType+"_attemptPlayerAction"+this.gameId]);
	}
	
	
	
	spawnItemOnGround(items, newX, newY){ 
		var newItem={x:newX, y:newY, items:items.items, tool:items.tool, progress:items.progress, progressType:items.progressType};
		this.gameController.gameState.items.push(newItem);
		return newItem;		
	}

	removeItemFromGround(items){
		for(var i=0; i< this.gameController.gameState.items.length;i++){
			if(this.gameController.gameState.items[i]==items){
				this.gameController.gameState.items.splice(i,1);
			}
		}
	}
	
	
	
	combineItems(stack1, stack2){
		for(var i=0;i< stack2.items.length;i++){
			stack1.items.push(stack2.items[i]);	
		}
		if(stack1.tool==NONE){
			stack1.tool=stack2.tool;
		}
		var result=this.checkStackForTransitions(stack1);
		return result;	
	}
	
	
	checkStackForTransitions(stack){
		var newStack=stack;
		var oldStack=newStack;
		var appliedTrans=undefined;
		var attempts = 0;
		do{
			oldStack=newStack;
			appliedTrans=undefined;
			for(var i=0;i<this.gameController.getItemTransitions().length;i++){
				var currentTrans=this.gameController.getItemTransitions()[i];
				if(currentTrans.action=="combine" && appliedTrans==undefined){
					var appliedTrans=this.applyTransitionOn(this.gameController.getItemTransitions()[i], oldStack, "combine");
					if(appliedTrans!=undefined){
						newStack=appliedTrans;
					}
				}
			}
			attempts++;
		}
		while(newStack!=oldStack && appliedTrans!=undefined);
		return newStack;
	}
	
	updateDispensers(){
		var updatedDispensers = [];
		for(var i=0;i<this.gameController.gameState.dispensers.length;i++){
			var dispenser=this.gameController.gameState.dispensers[i];
			if(dispenser.charges>=0){
				dispenser.secondsSinceLastCharged++;
				if(dispenser.rate>0 &&dispenser.secondsSinceLastCharged >= dispenser.rate){
					dispenser.charges++;
					dispenser.secondsSinceLastCharged=0;
					var tile=Object.values(this.gameController.getTiles())[dispenser.tile];
					if(tile.isForTools){
						if(dispenser.overCharge>0){
							dispenser.overCharge--;
						}
						else{
							dispenser.rate=0;
						}
					}
				updatedDispensers.push(dispenser);
				}
			}
		}
		if (updatedDispensers.length>0){
			this.gameController.handleComponentSignal({source:this, sourceClass: this.constructor.name, type:"dispenserCharge", target:updatedDispensers});
		}
	}
	
		
	spawnItemAtNextDispenser(itemType){
		var dispenserList=[];
		for(var i=0;i<this.gameController.gameState.dispensers.length;i++){
			var current=this.gameController.gameState.dispensers[i];
			var tile=Object.values(this.gameController.getTiles())[current.tile];
			if(tile.dispenserItem==itemType){
				dispenserList.push(current);
			}
		}
		this.dispenserIndexer = (this.dispenserIndexer+1) % dispenserList.length;
		var nextDispenser=dispenserList[this.dispenserIndexer];
		if(nextDispenser.rate==0){			
			nextDispenser.secondsSinceLastCharged=0;
			nextDispenser.rate=10; 
			//this.refreshDispenserInfo();
		}
		else{
			nextDispenser.overCharge++;
		}
	}
	

	
	checkProcessingTimerEvent(timerEvent){
		if(timerEvent.itemStack.progress  >= 1){
			this.stopProcessingTimer(timerEvent);
			var resultItemTool=this.getTransitionedItemStack(timerEvent.itemStack, timerEvent.tile.action);
			var itemGridX = Math.floor(timerEvent.itemStack.x/this.gameController.gameSettings.tileSizeW);
			var itemGridY = Math.floor(timerEvent.itemStack.y/this.gameController.gameSettings.tileSizeH);
			if (timerEvent.itemStack == this.getItemStackOfTile(itemGridX,itemGridY)){
				this.removeItemFromGround(timerEvent.itemStack);
				var newItemStack={items: resultItemTool.items, tool: resultItemTool.tool, progress:0,progressType:""};
				var newItemStackOnGround=this.spawnItemOnGround(newItemStack,timerEvent.itemStack.x, timerEvent.itemStack.y);
				var isPoop=newItemStack.items[0]==this.gameController.getIngredients()["poop"].id ;
				if(this.isToolBased){
					isPoop=newItemStack.tool==this.gameController.getTools()["poop"].id;
				}
				if(timerEvent.tile.progressType=="auto" && !isPoop){	
					newItemStackOnGround.progressType=timerEvent.tile.action;
					this.addProcessingTimer(timerEvent.tile, newItemStackOnGround, timerEvent.player);
				}
			}
		}		
	}
	
	
	
	addProcessingTimer(newTile, newItemStack, newPlayer){
		this.lastProcessingTimerId=this.lastProcessingTimerId+1;
		var newProcessingTimer={id:this.lastProcessingTimerId, tile: newTile, itemStack: newItemStack, player: newPlayer};
		var stepSize=1/(newTile.progress+1)
		if(newProcessingTimer.itemStack.progress==0){
			newProcessingTimer.itemStack.progress=stepSize-0.01;
		}
		newProcessingTimer.timer=setInterval(() => {
										newProcessingTimer.itemStack.progress=newProcessingTimer.itemStack.progress + stepSize; 
										this.checkProcessingTimerEvent(newProcessingTimer);
										}, 1000 );
		this.processingTimers.push(newProcessingTimer);
	}
	

	stopProcessingTimer(eventTimer){
		clearInterval(eventTimer.timer);
		for(var i=0;i<this.processingTimers.length;i++){
			if(this.processingTimers[i].id=eventTimer.id){
				this.processingTimers.splice(i,1);
			}
		}
	}
	

	getProcessingTimerOfTile(x,y){
		for(var i=0; i < this.processingTimers.length;i++){
			var itemX=Math.floor(this.processingTimers[i].itemStack.x/this.gameController.gameSettings.tileSizeW);
			var itemY=Math.floor(this.processingTimers[i].itemStack.y/this.gameController.gameSettings.tileSizeH);
			if( itemX==x && itemY==y){
				return this.processingTimers[i];
			}	
		}
		return undefined;
	}
	
	getProcessingTimerOfPlayer(userId){
		for(var i=0; i < this.processingTimers.length;i++){
			if(this.processingTimers[i].player==userId && this.processingTimers[i].tile.progressType=="manual"){
				return this.processingTimers[i];
			}	
		}
		return undefined;
	}
	
	
	changeIngredientNamesIntoList(namesList){
		var ingredientsList=[];
		for(var i=0;i<namesList.length;i++){
			if(namesList[i]!="*"){
				ingredientsList.push(this.gameController.getIngredients()[namesList[i]].id);
			}
		}
		return ingredientsList;
	}
	
	applyTransitionOn(transition, itemStack, action){
		var toolId=itemStack.tool;
		var toolName=NONE;
		if( toolId!=NONE){
			toolName=Object.values(this.gameController.getTools())[toolId].name;
		}
		if(transition.action==action && (transition.tool==toolName || transition.tool=="*")){
			var result={};
			if(transition.tool=="*" && transition.tool_output=="*"){
				result.tool=itemStack.tool;
			}else{
				if(transition.tool_output==NONE){
				result.tool=NONE;
				}
				else{
					result.tool=this.gameController.getTools()[transition.tool_output].id;
				}
			}
			if(transition.output=="*"){
				result.items=itemStack.items;
			}
			else{
				result.items=this.changeIngredientNamesIntoList(transition.output);
			}
			
			if(transition.input=="*"){
				return result;
			}
			if(transition.input.length==itemStack.items.length || transition.input.includes("*")){
				if(transition.ordered){
					var transitionInputFiltered=transition.input.filter( a => a!="*");
					var transitionOutputFiltered=transition.output.filter( a => a!="*");
					for(var i=0; i < itemStack.items.length;i++){
						if(Object.values(this.gameController.getIngredients())[itemStack.items[i]].name == transitionInputFiltered[0]){
							var fits=true;
							if((itemStack.items.length -i) >=(transitionInputFiltered.length)){
								for(var j=1;j<transitionInputFiltered.length;j++){
									if(transitionInputFiltered[j]!=Object.values(this.gameController.getIngredients())[itemStack.items[i+j]].name){
										fits=false;
									}
								}
								if(fits){
									if(transition.input.includes("*") &&transition.output.includes("*") && itemStack.items.length > (transition.input.length-1)){
										result.items=[];
										for(var k=0;k<i;k++){
											result.items.push(itemStack.items[k]);
										}
										var listTransformResult=this.changeIngredientNamesIntoList(transitionOutputFiltered);
										for(var k=0;k<listTransformResult.length;k++){
											result.items.push(listTransformResult[k]);
										}
										for(var k=(i + transitionInputFiltered.length);k<itemStack.items.length;k++){
											result.items.push(itemStack.items[k]);
										}
									}
									return result;
								}
							}
						}						
					}
				}
				else{
						for(var i=0;i<transition.input.length;i++){
							if(transition.input[i]!="*"){
								var isContained=Tools.isElementInList(itemStack.items, "", this.gameController.getIngredients()[transition.input[i]].id);
								if(!isContained && transition.input[i]!="*"){
									return undefined;
								}
							}
						}
				
					if(transition.input.includes("*") &&transition.output.includes("*") && itemStack.items.length > (transition.input.length-1)){
						var itemsToAdd=this.changeIngredientNamesIntoList(itemStack.items);
						for(var i=0;i<itemsToAdd.length;i++){
							result.items.push(itemsToAdd[i]);
						}
					}
				return result;	
				}	
			}
		}
		return undefined;

	}


	getTransitionedItemStack(itemStack, action){ //TODO maybe duplicate to checkSTackForTransitions
		for(var i=0;i<this.gameController.getItemTransitions().length;i++){
			var attempt=this.applyTransitionOn(this.gameController.getItemTransitions()[i], itemStack, action);
			if(attempt!=undefined){
				return attempt;
			}
		}
		
		if(this.isToolBased){
			return {items: [],tool:this.gameController.getTools()["poop"].id};
		}
		else{
			return {items: [this.gameController.getIngredients()["poop"].id],tool:itemStack.tool};
		}
		
	
	}
	
	
	getItemStackOfTile(x,y){
		for(var i=0; i< this.gameController.gameState.items.length;i++){
			var currentItem=this.gameController.gameState.items[i];
			var itemX=Math.floor(currentItem.x / this.gameController.mapHandler.tileSizeW);
			var itemY=Math.floor(currentItem.y / this.gameController.mapHandler.tileSizeH);
			if(itemX==x && itemY == y){
				return currentItem;
			}
		}
		return undefined;
		
	}
	
	isHoldingItem(userId){
		var player=this.gameController.playerHandler.getPlayerByUserId(userId);
		return player.hands.items.length>0 || player.hands.tool!=NONE;
	}
	
	getPosForItemAtCoords(x,y){
		var newX=x*this.gameController.mapHandler.tileSizeW + this.gameController.mapHandler.tileSizeW/2;
		var newY=y*this.gameController.mapHandler.tileSizeH + this.gameController.mapHandler.tileSizeH/2;
		var tileId=this.gameController.gameState.map.grid[y][x];
		var tile=Object.values(this.gameController.getTiles())[tileId];
		
		if(!this.gameController.mapHandler.isFloorTile(tile)){
			newY=newY-(Math.floor(this.gameController.mapHandler.tileSizeH/3));
		}
		
		return {x:newX, y:newY};
	}

	
	
	pickUpItem(userId, stackInFrontOfPlayer, tileInFront){
		this.removeItemFromGround(stackInFrontOfPlayer);
		var player=this.gameController.playerHandler.getPlayerByUserId(userId);
		var itemsFromPlayer=player.hands;
		if(itemsFromPlayer.items.length >0){
			player.hands.progress=0;
			player.hands.progressType="";	
			
		}
		else{
			player.hands.progress=stackInFrontOfPlayer.progress;
			player.hands.progressType=stackInFrontOfPlayer.progressType;
		}
		player.hands=this.combineItems(stackInFrontOfPlayer,itemsFromPlayer);
		
		var coords=this.gameController.mapHandler.getGridCoordsAt(stackInFrontOfPlayer.x,stackInFrontOfPlayer.y);
		var myProcessingTimer=this.getProcessingTimerOfPlayer(userId); 
		var tileProcessingTimer=this.getProcessingTimerOfTile(coords.x,coords.y);
		if(myProcessingTimer!=undefined ){
			this.stopProcessingTimer(myProcessingTimer);
		}
		if(tileProcessingTimer!=undefined ){
			this.stopProcessingTimer(tileProcessingTimer);
		}		
		
		
		this.gameController.handleComponentSignal({source:this, sourceClass: this.constructor.name, type:"playerPickUpItemStack", target:{userId: userId, tileInFront:tileInFront,stackInFrontOfPlayer:stackInFrontOfPlayer}});
			
	}	
	
	

	giveItemToPlayer(userId,tile,x,y){
		if(tile.action=="dispenser"){
			var player=this.gameController.playerHandler.getPlayerByUserId(userId);
			if(player.hands.items.length==0 &&player.hands.tool==NONE ){
				var dispenser=this.getDispenserObjectAt(x,y);
				if(dispenser != undefined && dispenser.charges!=0){
					var isTool=false;
					if(dispenser.charges>0){ 
						dispenser.charges--;
					}
					var newItemObject=this.gameController.getIngredients()[tile.dispenserItem];
					if(newItemObject != undefined){
						var newItem=newItemObject.id;
						player.hands= {items:[newItem],tool:NONE, progress:0,progressType:""};
					} else{ 	
							isTool=true;
							var newItem=this.gameController.getTools()[tile.dispenserItem].id;		
							player.hands= {items:[],tool:newItem, progress:0,progressType:""};
					}
					this.gameController.handleComponentSignal({source:this, sourceClass: this.constructor.name, type:"dispenserUsed", target:{userId: userId,dispenser:dispenser, itemId:newItem, isTool:isTool}});
				}
			}	
		}		
	}

	getDispenserObjectAt(x,y){
		for(var i=0;i<this.gameController.gameState.dispensers.length;i++){
			var current=this.gameController.gameState.dispensers[i];
			if(current.x==x && current.y==y){
				return current;
			}
		}
		return undefined;
	}

	getClosestItemToPlayer(player){
		var closestDistance=undefined;
		var closestItem=undefined;
		for(var i=0;i<this.gameController.gameState.items.length;i++){
			var currentItem=this.gameController.gameState.items[i];
			var xOffset = this.gameController.gameSettings.playerCollisionWidth*1.5;
			var yOffset = this.gameController.gameSettings.playerCollisionHeight*1.5;
			var direction=player.direction;
			var x = player.x;
			var y = player.y;
			if (direction.left) {
				x = x - xOffset;
			}
			if (direction.right) {
				x = x + xOffset;
			}
			if (direction.up) {
				y = y - yOffset;
			}
			if (direction.down) {
				y = y + yOffset;
			}
			var currentDistance=Tools.calcDistance(x,(y-this.gameController.gameSettings.playerHandsHeightModifier), currentItem.x,currentItem.y);
			
			var isFacingSameX=(currentItem.x <=player.x && !direction.right) ||(currentItem.x >=player.x && !direction.left);
			var isFacingSameY=(currentItem.y <=player.y && !direction.down) ||(currentItem.y >=player.y && !direction.up);
			
			if((closestDistance==undefined || currentDistance< closestDistance) && isFacingSameX && isFacingSameY ){
				closestDistance=currentDistance;
				closestItem=currentItem;
			}
			
		}
		return {item:closestItem, distance:closestDistance};
		
	}

	isEmptyItemStack(itemStack){
		var noTool= itemStack.tool==undefined || itemStack.tool=="" || itemStack.tool==NONE;
		var noItems= itemStack.items.length==0;
		return noTool && noItems;
		
	}
	
	useTile(x, y, tile, itemStack, userId){
		var hasAction=tile.action!=undefined && tile.action!=""&& tile.action!=NONE &&tile.action!="dispenser";
		var hasItem=itemStack != undefined &&itemStack.items.length>0 ;
		var hasTool=itemStack != undefined && itemStack.tool!=NONE ;
		
		if(hasAction && ((hasItem && !tile.isForTools)||(hasTool && tile.isForTools))){
			var tileProcessingTimer=this.getProcessingTimerOfTile(x,y); 
			if(tileProcessingTimer!=undefined ){
				this.stopProcessingTimer(tileProcessingTimer);
			}
			
			if(tile.progress>0 ){
				if(tile.action!=itemStack.progressType){
					itemStack.progressType=tile.action;
					itemStack.progress=0;
				}
				this.addProcessingTimer(tile, itemStack, userId);
			}
			if(tile.progress==0){
				var transitionedItemTool= this.getTransitionedItemStack(itemStack, tile.action);
				itemStack.items=transitionedItemTool.items;
				itemStack.tool=transitionedItemTool.tool;
				if(this.isEmptyItemStack(itemStack)){
					this.removeItemFromGround(itemStack);
				}
			}
			
			
		}
		

	}
	
	getToolNameFromStack(itemStack){
		var toolName=NONE;
		if(itemStack!=undefined){
			var toolFromStack=itemStack.tool;
			var tool=Object.values(this.gameController.getTools())[toolFromStack];
			if(tool!=undefined){
				toolName=tool.name;
			}	
		}
		return toolName;
	}
	
	getItemStackInFrontOfPlayer(player){
		var stackInFrontOfPlayer=undefined;
			var closestItemObject=this.getClosestItemToPlayer(player);
			if(closestItemObject.distance <=this.pickupDistance){
				var stackInFrontOfPlayer=closestItemObject.item;
			}
		return stackInFrontOfPlayer;
	}
		
	emptyPlayerHands(player){
		player.hands={items:[], tool:NONE, progress:0,progressType:""};
	}
	
	canDropItemHere(tileInFront, stackInFrontOfPlayer){
		var canDrop=!(tileInFront.isForTools && tileInFront.action=="dispenser") ;
		return canDrop;
	}
	
	canKeepTool(toolNameFromPlayer,toolNameFromGround,tileInFront ){
		var isDelete=(tileInFront.action != undefined && tileInFront.action == "delete") ;
		var isOtherTool=(toolNameFromGround!=NONE && toolNameFromPlayer!=NONE);
		var canKeep= isDelete || isOtherTool;
		return canKeep;
	}
	
	dropItemsOnGround(player){
		var userId=player.userId;
		var stackInFrontOfPlayer=this.getItemStackInFrontOfPlayer(player);

		var tileInFront=this.gameController.mapHandler.getTileWherePlayerIsLookingAt(userId);
		var playerHadIngredients=player.hands.items.length >0;
		var itemsFromPlayer=player.hands;
		
		var toolFromPlayer=player.hands.tool;
		var toolNameFromPlayer=this.getToolNameFromStack(player.hands);
		var toolNameFromGround=this.getToolNameFromStack(stackInFrontOfPlayer);

		if (this.canDropItemHere(tileInFront, stackInFrontOfPlayer)){
			this.emptyPlayerHands(player);
			if (this.canKeepTool(toolNameFromPlayer,toolNameFromGround,tileInFront)){
				player.hands.tool = toolFromPlayer;
			}
			if (stackInFrontOfPlayer== undefined ) {
				var targetGridCoords = this.gameController.mapHandler.getGridCoordsWherePlayerIsLookingAt(userId);
				var itemCoords = this.getPosForItemAtCoords(targetGridCoords.x,targetGridCoords.y);
				if (tileInFront.action != 'delete'){
					var stackInFrontOfPlayer = this.spawnItemOnGround(itemsFromPlayer, itemCoords.x, itemCoords.y);	
				} else {
					var stackInFrontOfPlayer = null;
				}
			}else{
				if(playerHadIngredients){
					stackInFrontOfPlayer.progress=0;
					stackInFrontOfPlayer.progressType="";		
				}
				
				var combinedStack=this.combineItems(stackInFrontOfPlayer,itemsFromPlayer);
				stackInFrontOfPlayer.items=combinedStack.items;
				stackInFrontOfPlayer.tool=combinedStack.tool;
			}
			this.gameController.handleComponentSignal({source:this, sourceClass: this.constructor.name, type:"playerDropItemStack", target:{userId: userId, tileInFront:tileInFront,stackInFrontOfPlayer:stackInFrontOfPlayer, playerHadIngredients:playerHadIngredients, toolFromPlayer:toolFromPlayer}});

			if (tileInFront.action != 'delete'){
				this.useTile(stackInFrontOfPlayer.x,stackInFrontOfPlayer.y,tileInFront,stackInFrontOfPlayer, userId);
			}
		}
	}


	attemptPlayerAction(socket, userId, direction){
		var player = this.gameController.playerHandler.getPlayerByUserId(userId);
		if (!player){
			return;
		}
		if (direction != null){
			player.direction = direction;
		}
		var tileInFront=this.gameController.mapHandler.getTileWherePlayerIsLookingAt(userId);
		var gridCoordsInFrontOfPlayer=this.gameController.mapHandler.getGridCoordsWherePlayerIsLookingAt(userId);
		
		if(this.isHoldingItem(userId)){	
			this.dropItemsOnGround(player);
		}
		else{
			var stackInFrontOfPlayer=this.getItemStackInFrontOfPlayer(player);
			if(stackInFrontOfPlayer!= undefined){
				this.pickUpItem(userId,stackInFrontOfPlayer,tileInFront);
				}
			else if(tileInFront.action=="dispenser"){
				this.giveItemToPlayer(userId,tileInFront,gridCoordsInFrontOfPlayer.x,gridCoordsInFrontOfPlayer.y);		
			}	
			else{
				this.gameController.handleComponentSignal({source:this, sourceClass: this.constructor.name, type:"useCustomTile", target:{userId: userId, tileInFront:tileInFront,x:gridCoordsInFrontOfPlayer.x,y:gridCoordsInFrontOfPlayer.y}});
			}
		}	
	}

}


module.exports = ItemInteraction2DGrid;
     
})(typeof exports === 'undefined'?  
            window: exports); 