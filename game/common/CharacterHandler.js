(function(exports) { 
/**
This component class handles customizations of players.
A player can choose how his character should look like, for example.
This component makes sure that the client side knows about the customizationOptions (will be sent as info)
as well as saving the current customization in the gamespecific customCharacters.json file.
With that file, the player-client side will be notified next time about your last choice so you dont have to go through the process of choosing an outfit again ;-)
If you are new, a defaultCharacter will be given.
How the selectedCharacter variable looks like is none of our business here!

This component expects the gameController to have a playerHandler.


The following handleComponentSignal's may be sent by this Component:
-


**/
var fs = require("fs");
var Tools = require('./../../static/common/tools.js');	
var CommonGameComponent = require('./CommonGameComponent.js');



class CharacterHandler extends CommonGameComponent{


	constructor(gameController, io, gameId, defaultCharacter, customizationOptions) {  
		super(gameController,  io, gameId);
		this.defaultCharacter=defaultCharacter;
		this.customizationOptions=customizationOptions;
		this.customCharacterFileName="game/"+this.gameController.gameType+"/resources/customCharacters.json";
		this.customCharacters=[];
		this.loadCustomCharactersFromFile();
	}	
	
	defineServerListenersFor(socket){	
		socket.on(this.gameController.gameType+"_requireCustomizations", ()=> this.sendCustomizations(socket.id));
	}

	deleteListeners(){
		this.io.removeAllListeners([this.gameController.gameType+"_requireCustomizations"]);
	}

	
	
	/**
		sends the customization options to the client side (if there are any)
		aswell as the player's last selected custom character choice.
	**/
	sendCustomizations(socketId){
		var userId=this.gameController.server.getUserIdBySocket(socketId);
		var customCharacter=this.getLastCustomCharacterFor(userId);
		this.io.to(socketId).emit(this.gameController.gameType+"_receiveCustomizations",this.customizationOptions,customCharacter);

	}
	
	/**
		method that stores the custom character of the given userId in the customCharacters file.
		an old custom character will be overwritten in the file.
	**/
	storeCustomCharacter(userId,newCharacter){
		var found=false;
		for(var i=0;i<this.customCharacters.length;i++){
			var currentCharacter=this.customCharacters[i];
			if(currentCharacter.userId==userId){
				currentCharacter.selectedCharacter=newCharacter;
				found=true;
			}		
		}
		if(!found){
			var newCharacterObject={userId: userId, selectedCharacter:newCharacter};
			this.customCharacters.push(newCharacterObject);
		}
		fs.writeFile(this.customCharacterFileName, JSON.stringify(this.customCharacters,null, '\t'), function (err) {
		if (err) return console.log("storeCustomCharacter error: "+err);
		});
		
	}

	/**
		method that loads all custom characters from the file and stores them in this.customCharacters .
	**/
	loadCustomCharactersFromFile(){
		var customCharactersFile=fs.readFileSync(this.customCharacterFileName);
		this.customCharacters=JSON.parse(customCharactersFile);
	}
	
	/**
		method that determines the last custom character for a given player by userId.
		if the player is new, the default Character will be returned
	**/
	getLastCustomCharacterFor(userId){
		for(var i=0; i <this.customCharacters.length;i++){
			if(this.customCharacters[i].userId==userId){
				return this.customCharacters[i].selectedCharacter;	
			}
		}
		var newCharacter= this.getCopyOfDefaultCharacter();
		return newCharacter;
	}
	
	/**
		method that returns a copy of the default character
	**/
	getCopyOfDefaultCharacter(){
		return Tools.copy(this.defaultCharacter);
	}
	




}


module.exports = CharacterHandler;
     
})(typeof exports === 'undefined'?  
            window: exports); 