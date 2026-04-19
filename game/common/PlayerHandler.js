(function(exports) { 
/**
This component class handles the joining and leaving of players.
A user that joins a game room is not a player yet. 
Upon _joinPlayer a user turns into a player object and joins a team.

This component expects the gameController to have a gameState object.
It will edit the gameController.gameState.players list!

A Team at this point is just a number. Usually, TeamNr 0 is "reserved" for observers.
But Team 0 may not be populated.

A player looks like this (atleast):

player={userId:userId, team: 0 , selectedCharacter: {?specific?}};

PlayerHandler may expect a CharacterHandler to be present in the GameController, if a joining player delivers a customCharacter Object.



The following handleComponentSignal's may be sent by this Component:
-changeTeam 
-joinPlayer
-leavePlayer
-changeTeamAmount


**/

var fs = require("fs");
var Tools = require('./../../static/common/tools.js');	

var CommonGameComponent = require('./CommonGameComponent.js');


class PlayerHandler extends CommonGameComponent{


	/**
		teams is just a number; 
		if theres only 1 team, its "2" because team 0 is always there for spectators
	**/
	constructor(gameController,  io, gameId, teams) {  
		super(gameController,  io, gameId);
		this.teams=teams;
	}	

	defineServerListenersFor(socket){	
		socket.on(this.gameController.gameType+"_joinPlayer"+this.gameId, (userId, teamNr,selectedCharacter) => this.joinGame(userId,teamNr, selectedCharacter, socket.id));
		socket.on(this.gameController.gameType+"_leavePlayer"+this.gameId, (userId) => this.leaveGame(userId) );
		socket.on(this.gameController.gameType+"_playerChangeTeam"+this.gameId, (userId, newTeamNr) => this.changeTeam(userId, newTeamNr));
		socket.on(this.gameController.gameType+"_setTeams"+this.gameId, amount => this.changeTeamAmount(amount) );
	}

	deleteListeners(){
		this.io.removeAllListeners([this.gameController.gameType+"_joinPlayer"+this.gameId]);
		this.io.removeAllListeners([this.gameController.gameType+"_leavePlayer"+this.gameId]);
		this.io.removeAllListeners([this.gameController.gameType+"_playerChangeTeam"+this.gameId]);
		this.io.removeAllListeners([this.gameController.gameType+"_setTeams"+this.gameId]);
	}

	

	/**
		returns all users that are currently connected to the server.
	**/
	getUsers(){
		return this.gameController.server.getUsers();
	}

	/**
		returns the teamNr of a player by the given userId. If its not a player, team 0 will be returned. Team 0 usually means it is an observer.
	**/
	getTeamOfPlayer(userId){
		for(var i=0; i<this.gameController.gameState.players.length;i++){
			if(this.gameController.gameState.players[i].userId==userId){
				return this.gameController.gameState.players[i].team;
			}
		}
		return 0;
	}
	/**
		changes the team of given userId to newTeamNr. If userId is not a player, nothing happens.
	**/

	changeTeam(userId, newTeamNr){
		for(var i=0; i<this.gameController.gameState.players.length;i++){
			if(this.gameController.gameState.players[i].userId==userId){
				this.gameController.gameState.players[i].team=newTeamNr;
			}
			this.gameController.handleComponentSignal({source:this, sourceClass: this.constructor.name, type:"changeTeam", target:userId});
		}
		
	}

	/**
		method that scrambles the teams.
		all players will be randomly, evenly spread over the amount of teams.
	**/
	scrambleTeams(){
		var randomOrderedPlayerList=Tools.scrambleList(this.gameController.gameState.players);
		for(var i=0; i <randomOrderedPlayerList.length;i++){
			for(var j=0;j<this.gameController.gameState.players.length;j++){
				if(randomOrderedPlayerList[i].userId==this.gameController.gameState.players[j].userId){
					this.gameController.gameState.players[j].team = (i % (this.teams-1))+1;
				}
			}
		}
	}
		
	/**
		method that changes the amount of teams to the given one.
		+1, because client side probably doesnt know that we always reserve one team for the spectators.
	**/
	changeTeamAmount(amount) {
		this.teams = amount+1;
		this.scrambleTeams();
		this.gameController.handleComponentSignal({source:this, sourceClass: this.constructor.name, type:"changeTeamAmount", target:this.teams});
	}
	/**
		method that makes a user join the game.
		this turns the user into a player and he joins a team.
		he may or may not have a custom character selection ("newCharacter") that will be stored in the player object.
		we dont care here how he looks like ;-)
		if there is a Character given, we will expect a characterHandler to be existent and ask him to store the custom looks.
	**/
	joinGame(userId, teamNr, newCharacter){
		var playerAlreadyExisting=false;
		var playerObject=undefined;
		for(var i=0; i<this.gameController.gameState.players.length;i++){
			if(this.gameController.gameState.players[i].userId==userId){
				playerAlreadyExisting=true;
				this.gameController.gameState.players[i].team=teamNr;
				this.gameController.gameState.players[i].selectedCharacter=newCharacter;
				this.gameController.handleComponentSignal({source:this, sourceClass: this.constructor.name, type:"changeTeam", target:userId});
			}
		}
		if(!playerAlreadyExisting){
			var newPlayer={userId: userId, team:teamNr};
			if (newCharacter!=undefined){
				newPlayer.selectedCharacter=newCharacter;
			}
			this.gameController.gameState.players.push(newPlayer);
			this.gameController.handleComponentSignal({source:this, sourceClass: this.constructor.name, type:"joinPlayer", target:userId});
			
		}

		if (newCharacter!=undefined && this.gameController.characterHandler!=undefined){
			this.gameController.characterHandler.storeCustomCharacter(userId,newCharacter);
		}
	}
	
	/**
		returns the amount of players in the given team
	**/
	getAmountPlayersForTeam(teamNr){
		var playerList=this.getPlayersForTeam(teamNr);
		return playerList.length;
	}
	
	/**
		returns the filtered list of players for a given team
	**/
	getPlayersForTeam(teamNr){
		var playerList=[];
		for (var i=0;i< this.gameController.gameState.players.length;i++){
			var currentPlayer=this.gameController.gameState.players[i];
			if(currentPlayer.team==teamNr){
				playerList.push(currentPlayer);
			}
		}
		return playerList;
	}
	
	/**
		returns a ordered version of the players list, where the players are ordered by their current team number. 
		inside the same team theres no special order.
	**/
	getPlayersOrderedByTeam(){
		var playersOrdered=[];
		for(var i=1;i<this.teams;i++){
			var currentTeam=this.getPlayersForTeam(i);
			playersOrdered= playersOrdered.concat(currentTeam);

		}
		return playersOrdered;
	}
	
	/**
		method that makes a player leave the game.
		he will be removed from the players list.
	**/
	leaveGame(userId){
		for(var i=0; i<this.gameController.gameState.players.length;i++){
			if(this.gameController.gameState.players[i].userId==userId){
				this.gameController.gameState.players.splice(i, 1);
			}
		}
		this.gameController.handleComponentSignal({source:this, sourceClass: this.constructor.name, type:"leavePlayer", target:userId});
	}


	/**
		method that turns the players list into a string
	**/
	playersToString(){
		var result="";
		for(var i=0;i<this.gameController.gameState.players.length;i++){
			var currentString="{"+i+" "+this.gameController.gameState.players[i].userId+" "+"}";
			result=result+currentString+"\n";
		}
		return result;
	}


	/**
		method that gives you the player object to a given userId.
		if that user is no player, null is returned.
	**/
	getPlayerByUserId(userId){
		for(var i=0;i<this.gameController.gameState.players.length;i++){
			if(this.gameController.gameState.players[i].userId==userId){
				return this.gameController.gameState.players[i];
			}
		}
		return null;
	}

}


module.exports = PlayerHandler;
     
})(typeof exports === 'undefined'?  
            window: exports); 