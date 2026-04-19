var socket = io();

var username = "";
var myUsername = "";
var userId =  0;
var adminUser;
var gameId=0;
var gameType="";
var users=[]; // simple list of userId, username
var gameRoom;
var isLoggedIn=false;


//To Reset UserID:
//setCookie("userId","");


socket.on('connect', () => refresh());
//socket.on('connect', () => loginPlayer());

function refresh(){

	loginCookie();
	
	//socket.emit('refresh',  userId);
}

////////////////////////////
// Define Server Events:
////////////////////////////


/*
var username = getUserName();
var userId =  getUserId();
socket.on('connect', () => loginPlayer());



socket.on('userIdChanged', function(newUserId) {
	userId=newUserId;
	setCookie("userId", newUserId, 365);
	refreshBrowserTabUserName();
});
*/

socket.on('joinedGameRoom', function(gameRoomId,newGameType) {
	gameId=gameRoomId;
	gameType=newGameType;
	redirectPage();

});

socket.on('failedJoinGame', function(reason) {
	confirm("Failed to join Game Room. Reason: "+reason);
});

socket.on('requestGamePassword', function(gameId) {
	joinGamePasswordPrompt(gameId);
});

socket.on('gameRoomsUpdated', function(allGameRooms, allSimpleUsersList, allGames) {
	users=allSimpleUsersList;
	gameRooms=allGameRooms;
	if(gameId==0 && isLoggedIn){
		if (typeof clearBoard === 'function') { 
			clearBoard();
		}
		if (typeof drawLobby === 'function') { 
			drawLobby(allGameRooms, allGames);
		}
		
		gameRoom=allGameRooms[0];
	}
});

socket.on('gameRoomUpdated', function(gameId,myGameRoom, allSimpleUsersList) {
	gameId=gameId;
	gameRoom=myGameRoom;
	users=allSimpleUsersList;
	adminUser=gameRoom.host;
});


socket.on('userNameChanged', function(newUserName) {
	//alert("username changed to: "+newUserName);
	//("Playernamechanged from "+username+" to "+newUserName);
	username=newUserName;
	myUsername=newUserName;
	setCookie("username_new", username, 5);
	refreshBrowserTabUserName();
});


// NEW LOGIN
socket.on('loginSuccessful', function(myUserName, myUserId) {
	userId=myUserId;
	username=myUserName;
	myUsername=myUserName;
	setCookie("username_new", username, 5);
	isLoggedIn=true;
	refreshBrowserTabUserName();
	//drawLobby();

	
});

socket.on('loginFail', function(myUserName, message, isAuto) {
	userId=0;
	username="";
	isLoggedIn=false;
	redirectPage();
	drawLogin();
	if (!isAuto){
		drawFailMessage(message);
	}
});

socket.on('signupSuccessful', function(myUserName, myUserId, pw) {
	alert("Signup successful! Your Username is '"+myUserName+"', and your Favourite Animal is '"+pw+"'.");
	username=myUserName;
	myUsername=myUserName;
	userId=myUserId;
	isLoggedIn=true;
	setCookie("username_new", username, 5);
	refreshBrowserTabUserName();
});

socket.on('signupFail', function(myUserName, message) {

	alert("signup failed with userName '"+myUserName+"', "+message);
	userId=0;
	username="";
	isLoggedIn=false;
	drawLogin();

	
});





document.addEventListener('keydown', function(event) {

		switch (event.keyCode) {
		case 13: //Enter
			console.log("ENTER");
			sendMessage();
			break;
		
	}
});

////////////////////////////
// Functions:
////////////////////////////

//Player / Login
function logoutPlayer(){
	socket.emit('logoutPlayer', username, userId);
	isLoggedIn=false;
	username="";
	userId=0;
	setCookie("username_new", "", 5);
	if (typeof clearBoard === 'function') { 
		clearBoard();
	}
	drawLogin();
	
}

function disconnectPlayer(){
	socket.emit('disconnectPlayer', username, userId);
	
}

function getUserName() {
	
	return username;
}

/*
function loginPlayer(){
	username = getUserName();
	userId =  getUserId();
	
	refreshBrowserTabUserName();
	
	socket.emit('playerlogin', username , userId);
}



function requestUserName(username, userId){
	socket.emit('userNameRequested', username, userId);
}



function getUserName() {
	if(username== null || username == undefined || username==""){
		username= getCookie("username");
	}
	
	if (username== null || username == undefined || username=="") {
		username = prompt("Please enter your name:", "");
    }
	return username;
}

*/

function getMyGameRoom(){
	return gameRoom;
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}


function deleteCookie(cname){
	var expires = "expires=Thu, 01 Jan 1970 00:00:00 GMT;";
	document.cookie = cname + "='';" + expires + ";path=/";
	
}


function kickPlayer(userIdToKick){
	
	if(adminUser==userId){
		socket.emit("kickPlayer",gameId,userIdToKick, userId);
	}
}

function changeGamePassword(newGamePw){
	if(adminUser==userId){
		socket.emit("requestChangeGamePassword",newGamePw,gameId);
	}
	
}

function getUserId() {
	if(userId== null || userId == undefined|| userId==""){
		userId= getCookie("userId");
	}
	if(userId== null || userId == undefined || userId==""){
		userId= 0;
	}
	return userId;
}

function refreshBrowserTabUserName(){
	if(isLoggedIn && getUserName() !==null && getUserName() !== undefined){
		document.title=gameType+" ("+getUserName()+")";
	}
	else{
		if(gameType !==null && gameType !== undefined&& gameType.length > 0){
			document.title=gameType; 
		}
		else{
			document.title="Partygoem";
		}
	}
}


function changeName(){
	var newUsername = prompt("Who do you want to be now again?!:", "");
	if (newUsername != "" && newUsername != null && newUsername != undefined) {
		socket.emit('changeUserNameRequested', newUsername, userId);
	}
}

function getUserNameById(userId){
	for(var i=0;i<users.length;i++){
		if(users[i].userId==userId){
			return users[i].username;
		}
	}
	return "Not_A_Player";
}


function getUserNamesByIds(userList){
	var newList=[];
	for(var i=0;i<userList.length;i++){
			newList.push(getUserNameById(userList[i]));
		
	}
	return newList;
}

/// GAME ROOM stuff


function createGameRoom(){

	var pw= document.getElementById("createGameRoomPwField").value;
	var gameName= document.getElementById("createGameRoomNameField").value;
	var maxPlayers= document.getElementById("createGameRoomSelectMaxPlayers").value;

	var type= document.getElementById("createGameRoomSelectType").value;
	
	if(gameName == undefined || gameName==""){
		gameName=username+"'s Room";
	}
	
	socket.emit('createGameRoom', userId,gameName,type,pw,maxPlayers);
	
	
}


function joinGame(gameId){
	socket.emit('hasPasswordCheck', userId, gameId);
}

function leaveGame(){
	socket.emit('leaveGameRoom', userId,gameId);
	
}

function joinGamePasswordPrompt(gameId) {
	var pw = prompt("Password:", "");
	if (!(pw == null)) {
		socket.emit('joinGameRoom', userId, gameId, pw);
	}
}
  


//CHAT & LOG

socket.on('gameLog', function(logMessage) {
	var gameLogElement=document.getElementById('gameLog');

	if (gameLogElement){
		var newLogElement = createElementFromHTML(logMessage);
		gameLogElement.appendChild(newLogElement);
		gameLogElement.scrollTop = gameLogElement.scrollHeight;
	}
});


function createElementFromHTML(htmlString) {
	var div = document.createElement('div');
	div.innerHTML = htmlString.trim();
	return div.firstChild; 
}


function sendMessage(){
	var word = document.getElementById('inputMessage').value;
	if(word.length>0){
		socket.emit('newMessage', word);
		document.getElementById('inputMessage').value= "";
	}
}

var chatbox = document.getElementById('inputMessage');
if (chatbox){
	chatbox.addEventListener('keydown', function (e) {
		if(e.keyCode==13) {
		  var word = chatbox.value;
		  socket.emit('newMessage',word);
		  chatbox.value= "";
		}
	  });
}



function redirectPage(){
	
	var currentPage=window.location.href.substr(window.location.href.lastIndexOf("/")+1);
	
	//redirect to lobby if not already in lobby and gameId=0
	if( gameId==0 && (currentPage!=="")){	
		window.location.href = "/";
	}
	
	//redirect to gameType
	else{
		if( gameId>0 && gameType!==currentPage){
			window.location.href = gameType;
		}	
	}
	refreshBrowserTabUserName();
}

/*
//TEST
function startGame(){
	window.location.href = 'alchemore';
}
*/

function loginCookie(){
	var newUsername=getCookie("username_new");
	socket.emit("requestPlayerLoginCookie", newUsername);
}

function login(userName, pw){
	socket.emit("requestPlayerLogin", userName, pw);
}

function signup(userName, pw){
	if(userName!= undefined && userName!=""){
		socket.emit("requestPlayerSignup", userName ,pw);
	}
}
