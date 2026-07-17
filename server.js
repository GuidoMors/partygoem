(function(exports){
/////////////////////
// Dependencies
/////////////////////
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var fs = require("fs");
var _eval = require('eval')

var Tools = require('./static/common/tools.js');	

const { GAMES } = require('./app');

class ServerController{
	
	constructor() {  
		this.lastGameId=0;
		this.app = express();
		this.server = http.Server(this.app);
		this.io;
		this.users=[];
		this.admins=[];
		this.gameRooms=[{gameId: 0, gameName:"NewbieLobby", gameType:"lobby", host:-1, players:[], isRunning:false, pw:"", maxPlayers: 100, hash: ""}];
		this.gameTypes; 
		this.controllerClasses;
		this.initGameTypes();
		this.gameControllers=[];
		this.gameLog=[];
			
	}
////////////////////////
// Technical Variables
////////////////////////

static ADMINS_FILE_NAME="admins.json";
static USERS_FILE_NAME="users.json";

////////////////////////
// RUN Method
////////////////////////
	run(server, io){
		this.io=io;
		this.defineServerListeners();
		this.loadUsersFromFile();
		this.loadAdminsFromFile();
	}


///////////////////////////////
// Define Events to listen to
///////////////////////////////
	defineServerListeners(){
	  this.io.on('connection', (socket) =>{
		socket.on('requestUserLogin', (name, pw_hash, gameroom_hash) => this.requestUserLogin(socket, name, pw_hash, gameroom_hash)); 		
		socket.on('requestAdminLogin', (name, pw_hash) => this.requestAdminLogin(socket, name, pw_hash));	
		socket.on('logoutAdmin', (username, userId) => this.logoutAdmin(socket,username, userId));
		socket.on('changeUserNameRequested', (newName, userId) => this.changeUserNameRequested(socket,newName, userId));

		socket.on('validateGameroomHash', (hash) => this.validateGameroomHash(socket, hash, true));

		socket.on('refreshUser', ( userId) => this.refreshUser(socket, userId) );
		socket.on('refreshAdmin', ( userId) => this.refreshAdmin(socket, userId) );
		socket.on('disconnectPlayer', (username, userId) => this.disconnectPlayer(socket.id,username, userId));
		socket.on('hasPasswordCheck', (userId, gameId) => this.checkForPassword(socket, userId,gameId));
		socket.on('kickPlayer', (gameId, userIdtoKick, adminId) => this.kickPlayer(gameId, userIdtoKick, adminId)); 
		socket.on('newMessage', (message) => this.newChatMessage(socket,message, this.getGameIdByUser(this.getUserIdBySocket(socket.id)) ));
		socket.on('createGameRoom', (userId,  newGameName, newGameType, pw, maxPlayers) => this.createGameRoom(socket, userId, newGameName, newGameType, pw, maxPlayers) ); 
		socket.on('joinGameRoom', (userId,  gameId, pw) => this.joinGameRoom(socket, userId, gameId,pw)); 	
		socket.on('leaveGameRoom', (userId,  gameId) => this.leaveGameRoom(userId, gameId)); 	
		socket.on('requestChangeGamePassword', (newGamePw, gameId) => this.changeGamePassword(newGamePw, gameId)); 		
		
	  });

	}
////////////////////////
// ...Functions...
////////////////////////

	initGameTypes(){
		this.gameTypes=Tools.getFolderNamesInFolder(fs,path,"./game/").filter(function(e) { return e !=="common" });
		this.controllerClasses=[];
		for(var i=0; i <this.gameTypes.length;i++){
			var thisController= require("./game/"+this.gameTypes[i]+"/"+this.gameTypes[i]+"GameController.js");
			this.controllerClasses.push({name: this.gameTypes[i], controllerClass: thisController});
			thisController.initialize();
		}		
	}

	createGameController(newGameRoom, gameType, hash){
		var controller;
		for(var i=0;i < this.controllerClasses.length;i++){
			if(this.controllerClasses[i].name==gameType){
				controller=this.controllerClasses[i].controllerClass;
			}
		}
		
		var gameController = new controller(newGameRoom.gameId, newGameRoom.host, newGameRoom.gameName, this.io, this, hash);
		return gameController;	
	}
	
	
//*****************************
//Game/Lobby related Functions
//*****************************

	createGameRoom(socket,userId, newGameName, newGameType, newPw, maxAmountPlayers){
		if(this.getGameIdByUser(userId)==0){
			var gameRoomHash = Math.random().toString(36).slice(2,6).toLowerCase();
			var newGameId=this.getNewGameId();		
			var hostid = userId;
			var newGameRoom={gameId: newGameId, gameName:newGameName, gameType:newGameType, host:userId, players:[], isRunning:false, pw:newPw, maxPlayers: maxAmountPlayers, hash: gameRoomHash};
			this.gameRooms.push(newGameRoom);
			var newGameController=this.createGameController(newGameRoom, newGameType, gameRoomHash);
			this.gameControllers.push({gameId:newGameRoom.gameId, controller: newGameController});
			var event={gameId: newGameId, type:"createGameRoom", target:userId};
			this.refreshGameRoomInfo(newGameId,event);
			this.refreshGameRoomInfo(0,event);
			this.adminJoinGame(socket,userId,newGameId);
            this.pushLogMessage("{0} created a game room '{1}' for {2}.",[this.getUserNameByUserId(userId), newGameName, newGameType],  false, false, 0);
		
		}
	}

	validateGameroomHash(socket, hash, emit){
		if (!hash || hash == "" || hash == undefined || hash == false) {
			return false;
		}

		for(var i=0; i<this.gameControllers.length;i++){
			if(this.gameControllers[i].controller.hash == hash){
				if (emit){
					this.io.to(socket.id).emit('validateGameroomHash', hash, true);	
				}

				return true;		
			}	
		}

		if (emit){
			this.io.to(socket.id).emit('validateGameroomHash', hash, false);	
		}

		return false;
		
	}

	printRoomsOfSocket(socket){
        console.log(socket.rooms);
	}
	

	async printSocketsOfRoom(room){
		const rooms = this.io.of("/").adapter.rooms;
		console.log(rooms);
	}

	printUserList(){
		for(var i=0;i<this.users.length;i++){
			console.log("User ID="+this.users[i].userId+" Name="+this.users[i].username+" IP="+this.users[i].ip+" socketId="+this.users[i].socketId);
		}	
	}

	printAdminList(){
		for(var i=0;i<this.admins.length;i++){
			console.log("User ID="+this.admins[i].userId+" Name="+this.admins[i].username+" IP="+this.admins[i].ip+" socketId="+this.admins[i].socketId);
		}	
	}
	
	refreshUser(socket, userId){
		if (!this.isUserInGame(userId)){
			// ????? Not sure what to do here, send user to 404?
			console.log("????? Not sure what to do here, send user to 404?");
		} else {		 
			socket.join(this.getGameIdByUser(userId));
			var gameRoom=this.getGameRoomById(this.getGameIdByUser(userId))
			this.io.to(socket.id).emit('joinedGameRoom', gameRoom.gameId, gameRoom.gameType, false);		
			var event={gameId: this.getGameIdByUser(userId), type:"refreshPlayer", target:userId};
			this.refreshGameRoomInfo(this.getGameIdByUser(userId),event);		
		}	  
	}

	refreshAdmin(socket, userId){
		var gameId = this.getGameIdByUser(userId)
		if (!this.isAdminInGame(userId)){
			this.adminJoinGame(socket,userId,0);
			var event={gameId: gameId, type:"refreshPlayer", target:userId};
			this.refreshGameRoomInfo(gameId,event);	
		} else {		 
			socket.join(gameId);
			var gameRoom=this.getGameRoomById(gameId)
			this.io.to(socket.id).emit('joinedGameRoom', gameRoom.gameId, gameRoom.gameType, true);		
			var event={gameId: gameId, type:"refreshPlayer", target:userId};
			this.refreshGameRoomInfo(gameId,event);		
		}	 
	}

	
	getGameControllerByGameId(gameId){
		console.log("getGameControllerByGameId", gameId);
		console.log("gameControllers" + this.gameControllers);
		for(var i=0; i<this.gameControllers.length;i++){
			if(this.gameControllers[i].gameId==gameId){
				return this.gameControllers[i].controller;		
			}	
		}
		return null;
	}
	
	//TO DO, players are not added to gameRoom if they are already in it
	joinGame(socket, userId, gameId){
		console.log("joinGame", userId, gameId);
		var gameRoom=this.getGameRoomById(gameId);
		this.leavePlayers(userId);
		if (socket.rooms.has("0")) {
			socket.leave("0");
		}
		if (socket.rooms.has(0)) {
			socket.leave(0);
		}
		socket.join(gameId);
		gameRoom.players.push(userId);
        if(gameId >0){
            this.pushLogMessage("{0} joined game room '{1}'.",[this.getUserNameByUserId(userId), gameRoom.gameName],  false, false, 0);   
        }
		this.io.to(socket.id).emit('joinedGameRoom', gameId, gameRoom.gameType, false);	

		var event={gameId: gameId, type:"joinGameRoom", target:userId};
		this.refreshGameRoomInfo(gameId,event);		
	}	

	adminJoinGame(socket, userId, gameId){
		console.log("adminJoinGame "+ userId + " "+gameId );
		var gameRoom=this.getGameRoomById(gameId);
		if (socket.rooms.has("0")) {
			socket.leave("0");
		}
		if (socket.rooms.has(0)) {
			socket.leave(0);
		}
		socket.join(gameId);
        if(gameId >0){
            this.pushLogMessage("{0} joined game room '{1}'.",[this.getUserNameByUserId(userId), gameRoom.gameName],  false, false, 0);   
        }
		this.io.to(socket.id).emit('joinedGameRoom', gameId, gameRoom.gameType, true);	

		var event={gameId: gameId, type:"joinGameRoom", target:userId};
		this.refreshGameRoomInfo(gameId,event);		
	}	
	

	joinGameRoom(socket, userId, gameId, enteredPassword){
		console.log("joinGameRoom "+ userId + " "+gameId+ " "+enteredPassword );
		var gameRoom=this.getGameRoomById(gameId);
		if(gameRoom.pw==enteredPassword){
			if(gameRoom.players.length < gameRoom.maxPlayers || gameRoom.maxPlayers=="∞"){
				this.joinGame(socket, userId, gameId);
			}
			else{
				 this.io.to(socket.id).emit('failedJoinGame',"Lobby full");
			}	
		}
		else {
			this.io.to(socket.id).emit('failedJoinGame',"wrong Password");
		  }	
	}

	kickPlayer(gameId, userId, kickerId){
		var game= this.getGameRoomById(gameId);
		if(game.gameId==gameId && game.host==kickerId){
			this.pushLogMessage("{0} has been kicked.",[this.getUserNameByUserId(userId)], false, false, gameId);
			this.leaveGameRoom(userId,gameId);		
		} 
	}
	

	getGameRoomById(gameId){
		for(var i=0; i<this.gameRooms.length;i++){
			if(this.gameRooms[i].gameId==gameId){
				return this.gameRooms[i];
			}
		}
		return null;
	}

	getNewGameId(){
		 this.lastGameId++;
		 return this.lastGameId;
	}


	checkForPassword(socket, userId, gameId){
		if (this.getGameRoomById(gameId).pw) {
			this.io.to(socket.id).emit('requestGamePassword', gameId);
		  } else {
			this.joinGame(socket, userId, gameId);
		  }
	}

	 changeGamePassword(socket, newGamePw,gameId){
		var game=this.getGameRoomById(gameId);
		var requesterId=this.getUserIdBySocket(socket.id);
		if(requesterId==game.host){
			game.pw=newGamePw;
		}
	}


	requestUserLogin(socket, userName, pw_hash, gameroom_hash){
		var validated = this.validateGameroomHash(socket, gameroom_hash, false);

		if (!validated) {
			this.io.to(socket.id).emit("userLoginFail", userName, "Could not find the game room.", false);
			return;
		}

		var userId=0;
		var message="";
		for(var i=0; i< this.users.length;i++){
			if(userName.toLowerCase()==this.users[i].username.toLowerCase()){
				userId=this.users[i].userId;
				userName=this.users[i].username;
				if(pw_hash != this.users[i].pw ){
					//message="Something went wrong with your login attempt (hashing error).";
					message="Username already taken. Choose another one";
				}
			}
		}
		if(userId==0){
			var createUserAttempt = this.requestUserSignup(socket, userName, pw_hash);
			if (createUserAttempt != "success"){
				message = createUserAttempt;
			}
		}	

		if(message!=""){
			this.io.to(socket.id).emit("userLoginFail", userName, message, false);
		} else{	
			this.doOnSuccessfulUserLogin(socket, userId, userName, gameroom_hash);		
		}
	}

    doOnSuccessfulUserLogin(socket, userId, userName, gameroom_hash){
		console.log("doOnSuccessfulUserLogin "+ userId + " "+userName+ " "+gameroom_hash );
		this.updateUserInfoOnLogin(socket, userId, userName);
		this.io.to(socket.id).emit("userLoginSuccessful", userName, userId, gameroom_hash);
		var gameId = this.getGameIdByGameroomHash(gameroom_hash);
		this.pushLogMessage("{0} has connected.",[userName],  false, false, gameId);
		this.joinGame(socket, userId, gameId);
		this.refreshUser(socket,userId);
		//this should be joinGameRoom, there should then be a check on if it actually matches the player count etc,
    }

	getGameIdByGameroomHash(hash){
		console.log("getGameIdByGameroomHash:", hash);
		if (!hash || hash == "" || hash == undefined || hash == false) {
			return false;
		}
		console.log("getGameIdByGameroomHash 2:", this.gameRooms);
		for(var i=0;i<this.gameRooms.length;i++){
			if (this.gameRooms[i].hash == hash){
				return this.gameRooms[i].gameId;
			}
		}
		return false;
	}

	requestUserSignup(socket, userName, newPw){
		if(this.userNameExists(userName)){
			return "Username already taken";
		} else{
			if(userName == undefined || userName.length<=2){
				return "Username too short";
			}
			else{
				var newUserId = this.getNewUserId();
				this.createUser(socket, userName, newPw, newUserId);
				console.log("request User Signup successful: "+userName+" "+newUserId+" "+newPw);
				return "success";
			}
		}
		
	}

	requestAdminLogin(socket, userName, pw_hash){
		console.log("requestAdminLogin " + " "+userName+ " "+pw_hash );
		var userId=0;
		var message="";
		for(var i=0; i< this.admins.length;i++){
			if(userName.toLowerCase()==this.admins[i].username.toLowerCase()){
				userId=this.admins[i].userId;
				userName=this.admins[i].username;
				var user_pw_hash = this.simpleHash(this.admins[i].pw);
				if(pw_hash != user_pw_hash){
					message="Wrong password.";
				}
			}
		}
		if(userId==0){
			message="Admin username does not exist."
		}	

		if(message!=""){
			this.io.to(socket.id).emit("adminLoginFail", userName, message, false);
		} else{	
			this.doOnSuccessfulAdminLogin(socket, userId, userName);		
		}
	}

    doOnSuccessfulAdminLogin(socket, userId, userName){
		console.log("doOnSuccessfulAdminLogin " + " "+userId+ " "+userName );
		this.updateAdminInfoOnLogin(socket, userId, userName);
		this.io.to(socket.id).emit("adminLoginSuccessful", userName, userId);
		this.refreshAdmin(socket,userId);
		var gameId=this.getGameIdByUser(userId);
		this.pushLogMessage("{0} has connected.",[userName],  false, false, gameId);
    }
	
	userNameExists(name){
		for(var i=0; i< this.users.length;i++){
			if(name.toLowerCase()==this.users[i].username.toLowerCase()){
				return true;
			}
		}
		return false;
	}
	
	generateNewPassword(){
		return Tools.generateRandomString(4);
	}

	createUser(socket, newUserName, newPw, newUserId){
		var newUserId=this.getNewUserId();
		var newSocketId=socket.id;
		var newIp=socket.request.connection.remoteAddress;
		var lastLoginTime=new Date();
		var newUser={userId:newUserId, username:newUserName, pw: newPw, lastLoginTime: lastLoginTime, socketId:newSocketId, ip:newIp};
		this.users.push(newUser);
		this.saveUsersInFile();
	}
	
	getNewUserId(){
		var maxUserId=1;
		for(var i=0;i<this.users.length;i++){
			var currentUser=this.users[i];
			if(currentUser.userId >maxUserId){
				maxUserId=currentUser.userId;
			}
		}
		return (maxUserId+1);
		
	}
	
	updateUserInfoOnLogin(socket, userIdToUpdate, userName){
		for(var i=0;i<this.users.length;i++){
			if(this.users[i].userId==userIdToUpdate){	
				if(userName!=undefined && userName != "" && this.users[i].username!=userName){	
					this.users[i].username=userName;
				}
				this.users[i].socketId=socket.id;
				this.users[i].ip=socket.request.connection.remoteAddress;
				this.users[i].lastLoginTime=new Date();
			}	
		}
		this.saveUsersInFile();
	}

	updateAdminInfoOnLogin(socket, userIdToUpdate, userName){
		for(var i=0;i<this.users.length;i++){
			if(this.users[i].userId==userIdToUpdate){	
				if(userName!=undefined && userName != "" && this.users[i].username!=userName){	
					this.users[i].username=userName;
				}
				this.users[i].socketId=socket.id;
				this.users[i].ip=socket.request.connection.remoteAddress;
				this.users[i].lastLoginTime=new Date();
			}	
		}
		this.saveAdminsInFile();
	}

	disconnectPlayer(socketId, username, userId){
		console.log("disconnectPlayer " + " "+username+ " "+userId );
		var gameId=this.getGameIdByUser(userId);
		if (username != ""){
			this.pushLogMessage("{0} has disconnected.", [username],false, false,gameId);
		}
		if(this.getGameIdByUser(userId) == 0 ){
			this.leavePlayers(userId);
		}
		var event={gameId: gameId, type:"disconnectPlayer", target:userId};
		this.refreshGameRoomInfo(gameId, event);
	}

	logoutAdmin(socket,username, userId){
		console.log("Logout Player: "+username + " userId: "+userId);
        this.pushLogMessage("{0} has logged out.", [username],false, false,0);
		this.leavePlayers(userId);
		//TODO ??		
	}
	
	leavePlayers(userId){
		console.log("leaveplayers " + userId);
		for(var i=0;i<this.gameRooms.length;i++){
			for(var j=0;j<this.gameRooms[i].players.length;j++){
				if (this.gameRooms[i].players[j]== userId) {	
					this.gameRooms[i].players.splice(j, 1);
					//no more destroy game room on leaveplayers in this version?
					//if (this.gameRooms[i].players.length < 1 && i != 0) {
					//		this.destroyGameRoom(this.gameRooms[i].gameId);
					//	}
					return;
				}
			}
		}
	} 

	changeUserNameRequested(socket, newUserName, userId){
		var currentUserName=this.getUserNameByUserId(userId);
		var message="";
		if(currentUserName!=newUserName){
			if(!this.userNameExists(newUserName)){
				for(var i=0; i < this.users.length;i++){
					if(this.users[i].userId==userId){
						this.users[i].username=newUserName;	
						this.saveUsersInFile();
						var gameId=this.getGameIdByUser(userId);
						this.io.to(socket.id).emit("userNameChanged", newUserName);
						this.pushLogMessage("{0} has changed name to {1}. How creative.",[currentUserName, newUserName],  false, false,gameId);
					}
				}			
			}
			else{
				message="That name is already taken.";
			}
		}
		else{
			message="Thats already your name, did you already forget?!";
		}
		
		if(message!=""){
			this.pushLogMessage( "Can't change username to {0}. "+message, [newUserName], false,false,socket.id);			
		}	
	}


	getSimpleListOfAllUsers(){
		var simpleUsers=[];
		for(var i=0;i<this.users.length;i++){
			simpleUsers.push({userId: this.users[i].userId, username: this.users[i].username});
		}	
		return simpleUsers;	
	}

	refreshGameRoomInfo(gameId,event){
		console.log("refreshGameRoomInfo", gameId, event);
		if (gameId > 0) {
			this.io.to(gameId).emit('gameRoomUpdated', gameId, this.getGameRoomById(gameId), this.getSimpleListOfAllUsers());
			var controller = this.getGameControllerByGameId(gameId);
			if(controller !=null){
				controller.handleGameRoomChange(event);
			}
			else{
				console.log("WARNING/ISSUE: controller is null, couldnt find game id "+gameId + " for event "+ event);
			}
		}
		this.io.to(0).emit('gameRoomsUpdated', this.gameRooms, this.getSimpleListOfAllUsers(), GAMES);
	}

	getUsers(){
		return this.users;
	}

	getUserIdByUserName(username){
		var user =this.users.filter(function(e) { return e.username == username })[0];
		if(user == undefined){
			return -1;
		}
		else{
			return user.userId;
		}
	}

	getUserNameByUserId(userId){
		var user =this.users.filter(function(e) { return e.userId == userId })[0];
		if(user == undefined){
			return "Not_A_Player";
		} else{
			return user.username;
		}
	}

	getAdminNameByUserId(userId){
		var admin =this.admin.filter(function(e) { return e.userId == userId })[0];
		if(admin == undefined){
			return "Not_A_Player";
		} else{
			return admin.username;
		}
	}

	getUserNameBySocket(socketId){
		var user =this.users.filter(function(e) { return e.socketId == socketId })[0];
		if(user == undefined){
			return "Not_A_Player";
		}
		else{
			return user.username;
		}
	}

	getUserIdBySocket(socketId){
		var user =this.users.filter(function(e) { return e.socketId == socketId })[0];
		if(user == undefined){
			return "Not_A_Player";
		}
		else{
			return user.userId;
		}
	}
	
	getSocketIdByUserName(username){
		var user = this.users.filter(function(e) { return e.username == username })[0];
		if(user != undefined){
			return user.socketId;
		}

		var admin = this.admins.filter(function(e) { return e.username == username })[0];

		if(admin != undefined){
			return admin.socketId;
		}

		return "Not_A_Player";
	}

	getSocketIdByUser(userId){
		var user = this.users.filter(function(e) { return e.userId == userId })[0];
		if(user != undefined){
			return user.socketId;
		}

		var admin = this.admins.filter(function(e) { return e.userId == userId })[0];

		if(admin != undefined){
			return admin.socketId;
		}

		return "Not_A_Player";
	}

	getAllLoggedInUsers(){
		var loggedInUsers=[];
		for(var i=0; i<this.users.length;i++){
			var currentUser=users[i];
			if(currentUser.socketId != null && currentUser.socketId!=""){
				loggedInUsers.push(currentUser);
			}
		}
		return loggedInUsers;
	}

	getGameIdByUser(userId){
		for(var i=0;i<this.gameRooms.length;i++){
			if (this.gameRooms[i].host == userId){
				return this.gameRooms[i].gameId;
			}
			for(var j=0;j<this.gameRooms[i].players.length;j++){
				if(this.gameRooms[i].players[j]==userId){
					return this.gameRooms[i].gameId;
				}
			}
		}
		return 0;
	}
	
	isUserInGame(userId){
		for(var i=0;i<this.gameRooms.length;i++){
			for(var j=0;j<this.gameRooms[i].players.length;j++){
				if(this.gameRooms[i].players[j] == userId){
					return true;
				}
			}
		}
		return false;
	}

	isAdminInGame(userId){
		for(var i=0;i<this.gameRooms.length;i++){
			if(this.gameRooms[i].host == userId){
				return true;
			}
		}
		return false;
	}
	
	getAllLoggedInUsersWithoutGame(){
		var loggedInUsers=[];
		for(var i=0; i<this.users.length;i++){
			var currentUser=this.users[i];
			if(currentUser.socketId != null && currentUser.socketId!=""){
				if(this.getGameIdByUser(currentUser.userId)==0){
					loggedInUsers.push(currentUser);
				}
			}
		}
		return loggedInUsers;
	}


	destroyGameRoom(gameId){
		console.log("destroyGameRoom " + gameId );
		for(var i=0;i<this.gameRooms.length;i++){
			if(this.gameRooms[i].gameId==gameId){
				this.gameRooms[i].isRunning=false;
				this.gameRooms.splice(i, 1);
			}
		}
		for(var i=0; i<this.gameControllers.length;i++){
			if(this.gameControllers[i].gameId==gameId){
				var gameControllerToBeDeleted=this.gameControllers[i];
				this.gameControllers.splice(i, 1);
				gameControllerToBeDeleted.controller.deleteYourself();
			}
		}	
		this.io.to(gameId).emit('gameRoomDestroyed', gameId);
	}
	
	async leaveGameRoom(userId, gameId) {
		console.log("leavegameroom "+ userId + " "+ gameId);
		if (!userId) return;

		const room = this.getGameRoomById(gameId);

		if (room && userId == room.host) {
			this.destroyGameRoom(gameId);
		} else if (room) {
			var event={gameId: gameId, type:"leaveGameRoom", target:userId};
			this.refreshGameRoomInfo(gameId, event);
		}

		var socketId = this.getSocketIdByUser(userId);
		var socket = this.io.sockets.sockets.get(socketId);

		if (socket && gameId) {
			try {
				socket.leave(gameId);
			} catch (err) {
				console.warn("socket.leave failed:", err);
			}

			this.joinGame(socket, userId, 0);
			this.pushLogMessage("{0} left the game.",[this.getUserNameByUserId(userId)],  false, false, gameId);	
		}

		this.leavePlayers(userId);
	}

	async getSocketBySocketId(socketId){
		const sockets = await this.io.fetchSockets();
		for (const socket of sockets) {
			if(socket.id==socketId){			
				return socket;
			}
		}
		return null;		
	}

	saveUsersInFile(){
		fs.writeFile(ServerController.USERS_FILE_NAME, JSON.stringify(this.users,null, '\t'), function (err) {
			if (err) return console.log("Save User Error: "+err);
		});
	}

	saveAdminsInFile(){
		fs.writeFile(ServerController.ADMINS_FILE_NAME, JSON.stringify(this.admins,null, '\t'), function (err) {
			if (err) return console.log("Save User Error: "+err);
		});
	}
	
	resetUsersFromFile() {
		this.users = [];
		fs.writeFileSync(ServerController.USERS_FILE_NAME, JSON.stringify([]));
	}

	loadUsersFromFile(){
		var usersFile=fs.readFileSync(ServerController.USERS_FILE_NAME);
		this.users=JSON.parse(usersFile);
	}

	loadAdminsFromFile(){
		var adminFile=fs.readFileSync(ServerController.ADMINS_FILE_NAME);
		this.admins=JSON.parse(adminFile);
	}

	newChatMessage(socket, message,gameId){		
		//this.printRoomsOfSocket(socket);
		this.pushLogMessage(message, [this.getUserNameBySocket(socket.id)] ,true, false,gameId);		
	}


/**
Function that pushes a given LogMessages to either all Users or the specified user "to".
The message can contain placeholders, i.e."{0}", which means that the first element of the args array should be replaced here.
The message will be interpreted to have placeholders, IF the argument "isRaw" is false. Else the message will be taken 1:1.
If the message "is raw", then the first argument of "args" is mandatory and will be interpreted as the sender (i.e. player name or "server") and will be put in front of the message.
The parameter "important" defines whether the message should be printed in bold or not.

**/
	pushLogMessage( message, args, isRaw, important, to){
		var logMessageHTML;
		if(isRaw){
			logMessageHTML='<p><span><b>'+args[0]+':</b> '+message+'</span></p>';
		}
		else{
			if(important){
				logMessageHTML='<p><span><b>'+ServerController.replaceStringArgs(message,args)+'</b></span></p>';
			}
			else{
				logMessageHTML='<p><span>'+ServerController.replaceStringArgs(message,args)+'</span></p>';
			}	
		}

		this.gameLog.push(logMessageHTML);
		if(to == undefined || to ==null ){
			this.io.sockets.emit("gameLog", logMessageHTML);
		}
		else{
			this.io.to(to).emit("gameLog", logMessageHTML);	
		}
	}

	simpleHash(str) {
		let hash = 0;

		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) - hash) + str.charCodeAt(i);
			hash |= 0; // convert to 32-bit int
		}

		return Math.abs(hash).toString(16);
	}

	
	static replaceStringArgs(message, args){
		var result=message;
		for(var i=0;i<args.length;i++){
			result=result.replace("{"+i+"}", args[i]);		
		}	
		return result;	
	}
	

}

module.exports = ServerController;
     
})(typeof exports === 'undefined'?  
            window: exports); 
