(function(exports) { 
/**
	Common Game Controller Class.
	Every game specific gameController should extend this class.
	CommonGameController combines everything a gameController should have at the bare minimum, 
	which is for example the reference to the server.
	
	The skeleton of defining server event listeners (emits) is defined in this class.
	Of course, every sub class can define its own listener/events by implementing the defineServerListenersFor(socket) function.


**/
var serverC=require("./../../server.js");
var Tools = require('./../../static/common/tools.js');	
var PlayerHandler=require("./PlayerHandler.js");
var fs = require("fs");



class CommonGameController{

	constructor(gameType, gameId, host, gameName, io, server) {  
		this.components=[];
		this.playerHandler=new PlayerHandler(this,io, gameId,2);
		this.io=io;
		this.gameType=gameType;
		this.server=server;
		this.gameId = gameId;
		this.gameHost = host;
		this.gameName = gameName;
		this.defineServerListeners();
	}	

	async defineServerListeners(){
		const sockets = await this.io.fetchSockets();
		for (const socket of sockets) {
			this.defineServerListenersFor(socket);
			
		}
		this.io.on('connection', socket => this.defineServerListenersFor(socket) );
	}
	
	
	/**
		to be implemented by subclasses!
		This method defines all the events that this game is listening on from the client.
	**/
	defineServerListenersFor(socket){
		
	}
	/**
		function that should delete all listeners so that no client listens to this gameId anymore.
	**/
	async deleteSockets(){
		var sockets = await this.io.fetchSockets();
		for (var  socket of sockets) {
			socket.leave(this.gameId);
		}
	}
	
	/**
		to be implemented by subclasses! 1:1 from defineServerListenersFor
	**/
	deleteListeners(){
				
	}
	
	/**
		gets called by server when game room is destroyed (everyone left)
	**/
	deleteYourself(){
		for(var i=0;i<this.components.length;i++){
			this.components[i].deleteYourself();
		}
		this.deleteListeners();
		this.deleteSockets();

	}
	
	addComponent(component){
		this.components.push(component);
	}

	/**
		This method can be implemented if something should be done when the server sends the event that the game room has changed.
	**/
	handleGameRoomChange(event){	
		//nothing to do here (yet?). Is called by server on game room changed
	}	
	/**
		This method can be implemented if you want to react on a component specific event.
	**/
	handleComponentSignal(event){
		//nothing to do here (yet?) can be called by all kinds of "child" components to notify the main game controller about something
		/*
			if(event.source==this.playerHandler){
				this.giveGameStates();
			}
		}*/				
	}

	getMyGameRoom(){
		for (var i = 0; i < this.server.gameRooms.length; i++){
			if (this.server.gameRooms[i].gameId == this.gameId){
				return this.server.gameRooms[i];
			}
		}
		return undefined;
	}
	
		
	log(message){
		var ts=new Date(); 
		var msg=ts.toISOString()+"|"+this.gameType+"|"+this.gameId+"|"+message;
		console.log(msg);		
	}

}

module.exports = CommonGameController;
     
})(typeof exports === 'undefined'?  
            window: exports); 