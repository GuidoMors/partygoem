/*Script for general client-Side functions*/


/** general VARIABLES**/
var tabActive = "chat";

socket.on('gameRoomUpdated', function(gameId, myGameRoom, allSimpleUsersList) {
	if (tabActive == "playerlist"){
		activatePlayerlistTab();
	}
});


function activateSideTab(){

	document.getElementById("gameLog").style.display = "none";
	document.getElementById("typeBox").style.display = "none";
	document.getElementById("sideLog").style.display = "block";
	document.getElementById("playerlistLog").style.display = "none";

	document.getElementById("playerlistButton").style.display = "block";
	document.getElementById("backToChatButton").style.display = "none";

	tabActive = "side";
}

function activateChatTab(){
	document.getElementById("gameLog").style.display = "block";
	document.getElementById("typeBox").style.display = "block";
	var sidelog = document.getElementById("sideLog")
	if (sidelog){
		sidelog.style.display = "none";
	}


	document.getElementById("playerlistLog").style.display = "none";

	document.getElementById("playerlistButton").style.display = "block";
	document.getElementById("backToChatButton").style.display = "none";

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

