(function(exports) { 
/**
-
**/
var fs = require("fs");
var Tools = require('./../../static/common/tools.js');	


class CommonGameComponent{

	constructor(gameController, io, gameId) {  
		this.io=io;
		this.gameId=gameId;
		this.gameController=gameController;
		this.gameController.addComponent(this);
		this.defineServerListeners();
	}	
	
	defineServerListenersFor(socket){	
		//should be overwritten
	}

	deleteListeners(){
		//should be overwritten
	}

	//can be overwritten but must call super() at the end
	deleteYourself(){
		this.deleteListeners();
	}

	async defineServerListeners(){
		const sockets = await this.io.fetchSockets();
		for (const socket of sockets) {
			this.defineServerListenersFor(socket);
		}
		this.io.on('connection', socket => this.defineServerListenersFor(socket)  );
	}
		
	log(message){
		var ts=new Date(); 
		var msg=ts.toISOString()+"|"+this.gameType+"|"+this.gameId+"|"+message;
		console.log(msg);		
	}

}


module.exports = CommonGameComponent;
     
})(typeof exports === 'undefined'?  
            window: exports); 