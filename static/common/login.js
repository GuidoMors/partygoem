var socket = io();

var username = "";
var myUsername = "";
var userId =  0;
var gameroomHash = "";
var adminUser;
var gameId=0;
var gameType="";
var users=[]; // simple list of userId, username
var gameRoom;
var isLoggedIn=false;

socket.on('connect', () => refresh());

function refresh(){

	if (isLoggedIn){
		return;
	}

	const params = new URLSearchParams(window.location.search);
	var gameroom_hash = params.get("room");

	if (gameroom_hash){
		setCookie("user_gameroom_hash", gameroom_hash)
	} else {
		gameroom_hash = getCookieValue("user_gameroom_hash");
	}

	var loginAttempt = adminLoginWithCookie();

	if (loginAttempt){
		return;
	}

	if (gameroom_hash) {
		socket.emit('validateGameroomHash', gameroom_hash);
	} else {

		loginAttempt = userLoginWithCookie();

		if (loginAttempt){
			return;
		}

		if (window.location.pathname == "/login") {
			drawLogin();
		} else {
			redirectTo404();
		}
		
	}
}



////////////////////////////
// Define Server Events:
////////////////////////////

socket.on('validateGameroomHash', function(hash, validated) {
	var gameroom_hash = getCookieValue("user_gameroom_hash");

	if (hash == gameroom_hash){
		if (validated){
			startUserCookieCreationProcess();
		} else {
			if (window.location.pathname == "/login") {
				drawLogin();
			} else {

				redirectTo404();
			}
		}
	}

});


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
	console.log()
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

socket.on('gameRoomDestroyed', function(destroyedGameId) {
	if (gameId == destroyedGameId){
		socket.emit('hasPasswordCheck', userId, 0); //join lobby
	}
});


socket.on('userNameChanged', function(newUserName) {
	username=newUserName;
	myUsername=newUserName;
	setCookie("user_name", username);
	refreshBrowserTabUserName();
});

socket.on('adminNameChanged', function(newUserName) {
	username=newUserName;
	myUsername=newUserName;
	setCookie("admin_name", username);
	refreshBrowserTabUserName();
});


// NEW LOGIN
socket.on('userLoginSuccessful', function(myUserName, myUserId, myGameRoomHash) {
	console.log("succesful login");
	userId=myUserId;
	username=myUserName;
	myUsername=myUserName;
	gameRoomHash=myGameRoomHash;
	setCookie("user_name", username);
	//setCookie("user_gameroom_hash", myGameRoomHash);
	setCookie("user_id", myUserId);
	isLoggedIn=true;
	refreshBrowserTabUserName();
});

socket.on('adminLoginSuccessful', function(myUserName, myUserId, myGameRoomHash) {
	userId=myUserId;
	username=myUserName;
	myUsername=myUserName;
	gameRoomHash=myGameRoomHash;
	setCookie("admin_name", username);
	setCookie("admin_gameroom_hash", username);
	setCookie("admin_id", myUserId);
	isLoggedIn=true;
	refreshBrowserTabUserName();
});

socket.on('adminLoginFail', function(myUserName, message, isAuto) {
	userId=0;
	username="";
	isLoggedIn=false;
	redirectPage();
	drawLogin();
	if (!isAuto){
		drawFailMessage(message);
	}
});

socket.on('userLoginFail', function(myUserName, message, isAuto) {
	console.log("userloginFail", message);
	userId=0;
	username="";
	isLoggedIn=false;
	if (!isAuto){
		drawFailMessage(message);
	}
});

// socket.on('signupSuccessful', function(myUserName, myUserId, pw) {
// 	alert("Signup successful! Your Username is '"+myUserName+"', and your Favourite Animal is '"+pw+"'.");
// 	username=myUserName;
// 	myUsername=myUserName;
// 	userId=myUserId;
// 	isLoggedIn=true;
// 	setCookie("username_new", username);
// 	refreshBrowserTabUserName();
// });

// socket.on('signupFail', function(myUserName, message) {

// 	alert("signup failed with userName '"+myUserName+"', "+message);
// 	userId=0;
// 	username="";
// 	isLoggedIn=false;
// 	drawLogin();

	
// });

function drawFailMessage(message){
	var failDiv = document.getElementById('failDiv');
	if (failDiv){
		failDiv.innerHTML = message;
	}
	
}


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
function logoutAdmin(){
	socket.emit('logoutAdmin', username, userId);
	isLoggedIn=false;
	username="";
	userId=0;
	setCookie("admin_name", "");
	setCookie("admin_pw_hash", "");
	setCookie("admin_gameroom_hash", "");
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

function getMyGameRoom(){
	return gameRoom;
}

function getCookieValue(cname) {
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
  if (!exdays){
	exdays = 5;
  }
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
		userId = getCookieValue("userId");
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


function changeUserName(){
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
	socket.emit('leaveGameRoom', userId, gameId);
	
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
	if( gameId==0 && (currentPage!=="404.html")){	
		redirectTo404();
	}

	//redirect to gameType
	else{
		if( gameId>0 && gameType!==currentPage){
			window.location.href = `/${gameType}`;
		}	
	}
	refreshBrowserTabUserName();
}

function startUserCookieCreationProcess(){
	var gameroom_hash = getCookieValue("user_gameroom_hash");

	if (!gameroom_hash) {
		var params = new URLSearchParams(window.location.search);
		gameroom_hash = params.get("room");
		if (!gameroom_hash){
			redirectTo404();
			return;
		}
		setCookie("user_gameroom_hash", gameroom_hash);
	}

	var name = getCookieValue("user_name");

	if (!name) {
		redirectToConnect();
	} else {
		userLoginWithCookie();
	}

}

function redirectToConnect() {
    if (!window.location.pathname.endsWith("/connect.html")) {
        window.location.href = "/static/common/connect.html" + window.location.search;
    }
}

function redirectTo404() {
    if (!window.location.pathname.endsWith("/404.html")) {
		const query = window.location.search;
        window.location.href = "/static/common/404.html" + window.location.search;
    }
}

function connectButton(name){

	if(name!= undefined && name!=""){
		if (getCookieValue("user_name") != name){
			setCookie("user_name", name);
			var pw_hash = simpleHash(socket.id + name).slice(0, 8);
			setCookie("user_pw_hash", pw_hash);
		}
		userLoginWithCookie();
	} else {
		drawFailMessage("Please insert a proper username.");
	}
}

function userLoginWithCookie(){
	
	var name = getCookieValue("user_name");
	var pw_hash = getCookieValue("user_pw_hash");
	var gameroom_hash = getCookieValue("user_gameroom_hash");

	if (!name || name == false || name == undefined || 
		!gameroom_hash  || gameroom_hash == false || gameroom_hash == undefined
	) {
		return false;
	} else {
		if (!pw_hash){
			var pw_hash = simpleHash(socket.id + name).slice(0, 8);
			setCookie("user_pw_hash", pw_hash);
		}
		
		console.log(name, pw_hash, gameroom_hash);
		socket.emit("requestUserLogin", name, pw_hash, gameroom_hash);
		return true;
	}
	
}

function adminLoginWithCookie(){
	var name = getCookieValue("admin_name");
	var pw_hash = getCookieValue("admin_pw_hash");

	if (!name || !pw_hash ){
		return false;
	} else {
		socket.emit("requestAdminLogin", name, pw_hash);
		return true;
	}
}

function adminLogin(userName, pw){
	var pw_hash = simpleHash(pw);
	setCookie("admin_name", userName);
	setCookie("admin_pw_hash", pw_hash);
	socket.emit("requestAdminLogin", userName, pw_hash);
}

// function signup(userName, pw){
// 	if(userName!= undefined && userName!=""){
// 		socket.emit("requestPlayerSignup", userName ,pw);
// 	}
// }

function simpleHash(str) {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // convert to 32-bit int
    }

    return Math.abs(hash).toString(16);
}
