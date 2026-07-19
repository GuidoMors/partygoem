/*Script for general client-Side functions*/


/** general VARIABLES**/
var tabActive = "chat";

socket.on('gameRoomUpdated', function(gameId, myGameRoom, allSimpleUsersList) {
	if (tabActive == "playerlist"){
		activatePlayerlistTab();
	}
});


function activateSideTab(){


	var gameLog = document.getElementById("gameLog");
	if (gameLog){
		gameLog.style.display = "none";
	}
	var typeBox = document.getElementById("typeBox");
	if (typeBox){
		typeBox.style.display = "none";
	}
	var sidelog = document.getElementById("sideLog")
	if (sidelog){
		sidelog.style.display = "block";
	}
	var playerListLog = document.getElementById("playerlistLog");
	if (playerListLog){
		playerListLog.style.display = "none";
	}
	var playerlistButton = document.getElementById("playerlistButton");
	if (playerlistButton){
		playerlistButton.style.display = "block";
	}
	var backToChatButton = document.getElementById("backToChatButton");
	if (backToChatButton){
		backToChatButton.style.display = "none";
	}

	tabActive = "side";
}

function activateChatTab(){
	var gameLog = document.getElementById("gameLog");
	if (gameLog){
		gameLog.style.display = "block";
	}
	var typeBox = document.getElementById("typeBox");
	if (typeBox){
		typeBox.style.display = "block";
	}
	var sidelog = document.getElementById("sideLog")
	if (sidelog){
		sidelog.style.display = "none";
	}
	var playerListLog = document.getElementById("playerlistLog");
	if (playerListLog){
		playerListLog.style.display = "none";
	}
	var playerlistButton = document.getElementById("playerlistButton");
	if (playerlistButton){
		playerlistButton.style.display = "block";
	}
	var backToChatButton = document.getElementById("backToChatButton");
	if (backToChatButton){
		backToChatButton.style.display = "none";
	}

	tabActive = "chat";
}

function swapTab(){
	if (tabActive == "chat") {
		activateSideTab();
	} else {
		activateChatTab();
	}
}

function activatePlayerlistTab(){

	var playerlist = document.getElementById("playerlistLog");

	playerlist.style.display = "block";

	playerlistbutton = document.getElementById("playerlistButton");
	if (playerlistbutton){
		playerlistbutton.style.display = "none";
	}

	backtochatbutton = document.getElementById("backToChatButton");
	if (backtochatbutton){
		backtochatbutton.style.display = "block";
	}

	tabActive = "playerlist";
	
	drawPlayerListTab();
}

function drawPlayerListTab(){

	var playerlist = document.getElementById("playerlistLog");

	playerlist.innerHTML="";

	var text = "";
	for (var i = 0; i < getMyGameRoom().players.length; i++){
		
		var playerblock = document.createElement("div");
		playerblock.classList.add("playerblocktab");

		var text = document.createElement("p");
		text.innerHTML = getUserNameById(getMyGameRoom().players[i]);
		playerblock.appendChild(text);	

		if (GAME_NAME != "lobby" && getMyGameRoom().host == userId && userId != getMyGameRoom().players[i]){
			var kickbutton = document.createElement("button");
			kickbutton.innerHTML = "X";
			kickbutton.id = getMyGameRoom().players[i];
			kickbutton.addEventListener('click', function(event) {
				kickPlayer(event.currentTarget.id);
			});
			playerblock.appendChild(kickbutton);
		}

		playerlist.appendChild(playerblock);
	}
}

function toggleMenu() {
	var menuDiv = document.getElementById('right');
	var chevron = document.getElementById('chevron');

    if (menuDiv.classList.contains('open')) {
        menuDiv.classList.remove('open');
        chevron.classList.remove('open');
    } else {
        menuDiv.classList.add('open');
        chevron.classList.add('open');
    }
}

