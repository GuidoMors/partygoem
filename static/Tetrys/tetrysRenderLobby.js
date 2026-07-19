/*Script to render a game-specific lobby.*/



var selectedTeam=1;

var selectedCharacter;


//refresh html when new player connects // Press F5
socket.emit(GAME_NAME+"_requireCustomizations");		

socket.on(GAME_NAME+"_receiveCustomizations", function(customizationOptions, customCharacter){	
	customizationOptions=customizationOptions;
	selectedCharacter=customCharacter;
});

socket.on(GAME_NAME+"_maxPlayersReached", function(maxPlayerAmount){	
	console.log("Join Game failed - maximum amount of players ("+maxPlayerAmount+") reached");
});

function removeLobby(){
	var middle = document.getElementById("middle");
	middle.style.display = "none";

	// var changeButton = document.getElementById("changeNameButton");
	// changeButton.style.display = "none";

	var swapButton = document.getElementById("swapTabButton");
	if (swapButton){
		swapButton.style.display = "block";
	}
	

	var wrapper = document.getElementById("canvasWrapper");
	if (wrapper){
		wrapper.style.display = "block";
	}

	var gameScore = document.getElementById("gameScore");
	if (gameScore){
		gameScore.style.display = "block";
	}
	
}

function hideSideMenu() {
    var sideMenu = document.getElementById("right");
    if (sideMenu) {
        sideMenu.remove();
    }
}

function clearGameLobby(){
	deleteGuiElement('lobbyDiv');
	deleteGuiElement('characterSelectionDiv');
	deleteGuiElement('playerPics');
	deleteGuiElement('gameLogoDiv');
	
}

function createTeamDiv(playerListToDraw, team){
	var playerPics=document.createElement("div");
	playerPics.setAttribute("id","playerPics");
	playerPics.classList.add("playerPicsLobby");
	for(var i=0;i<playerListToDraw.length;i++){
		if (playerListToDraw[i].team == team) {
			var characterDivImage= createCharacterImageDivPlayer(i, getUserNameById(playerListToDraw[i].userId), playerListToDraw[i].selectedCharacter,playerListToDraw[i].ready);
			playerPics.appendChild(characterDivImage);
		}
		
	}
	return playerPics;
	
}

function drawCharacterSelection(){

	deleteGuiElement("characterSelectionDiv");
	deleteGuiElement("readyButton");

	if (isMeHost()){
		// var readyButton=document.createElement("button");
		// readyButton.setAttribute("id","readyButton");
		// readyButton.innerHTML = "START";
		// readyButton.classList.add("readyButton");
		// readyButton.classList.add("BigButton");

		// readyButton.addEventListener('click', function(event) {
		// 	startGame();
		// });		

		// lobbyDiv.appendChild(readyButton);	

		// var lessTeamsButton =document.createElement("button");
		// lessTeamsButton.setAttribute("id","lessTeamsButton");
		// lessTeamsButton.innerHTML = "Teams--";
		// lessTeamsButton.classList.add("teamChoosingButton");
		// lobbyDiv.appendChild(lessTeamsButton);	

		// var moreTeamsButton =document.createElement("button");
		// moreTeamsButton.setAttribute("id","moreTeamsButton");
		// moreTeamsButton.innerHTML = "Teams++";
		// moreTeamsButton.classList.add("teamChoosingButton");
		// lobbyDiv.appendChild(moreTeamsButton);	

		// lessTeamsButton.addEventListener('click', function(event) {
		// 	if(gameSettings.teams >= 3){
		// 		setTeams(gameSettings.teams-2); //server adds one again for spectators
		// 	}
		// });	

		// moreTeamsButton.addEventListener('click', function(event) {
		// 	setTeams(gameSettings.teams);//server adds already 1 for spectators
		// });	

	} else {
		var characterSelectionDiv=document.createElement("div");
		characterSelectionDiv.setAttribute("id","characterSelectionDiv");
		characterSelectionDiv.classList.add("characterSelection");
		characterSelectionDiv.classList.add("neonwhite");
		characterSelectionDiv.classList.add("neonborder");
		buttonDiv.appendChild(characterSelectionDiv);

		var characterSelectionDivLeft=document.createElement("div");
		characterSelectionDivLeft.setAttribute("id","characterSelectionDivLeft");
		characterSelectionDivLeft.classList.add("characterSelectionDivLeft");

		var characterSelectionDivMiddle=document.createElement("div");
		characterSelectionDivMiddle.setAttribute("id","characterSelectionDivMiddle");
		characterSelectionDivMiddle.classList.add("characterSelectionDivMiddle");

		var characterSelectionDivRight=document.createElement("div");
		characterSelectionDivRight.setAttribute("id","characterSelectionDivRight");
		characterSelectionDivRight.classList.add("characterSelectionDivRight");

		characterSelectionDiv.appendChild(characterSelectionDivLeft);
		characterSelectionDiv.appendChild(characterSelectionDivMiddle);
		characterSelectionDiv.appendChild(characterSelectionDivRight);

		drawCharacterSelectionLeft(characterSelectionDivLeft);
		drawCharacterSelectionMiddle(characterSelectionDivMiddle);
		drawCharacterSelectionRight(characterSelectionDivRight);
	}
	
}


function createCharacterImageDivDraft(id,name, tempSelectedCharacter){
	var characterDivImage = document.createElement("div");
	characterDivImage.setAttribute("id","characterDivImage_"+id);
	if(id=="draft"){
		characterDivImage.classList.add("customImageDisplayDraft");
	}else{
		characterDivImage.classList.add("customImageDisplay");
	}
	var playerCanvas=createCharacterImageCanvas(id, name , tempSelectedCharacter);
	characterDivImage.appendChild(playerCanvas);
	
	var middle = document.getElementById("characterSelectionDivMiddle");
	var characterName = document.createElement("span"); 
	characterName.setAttribute("id","playerNameTag_"+id);
	characterName.classList.add("myPlayerNameTag");
	characterName.classList.add("neonwhite");
	characterName.innerHTML=name;
	//draw/add them in correct order (first the one that is in the background)
	
	middle.appendChild(characterName);
	
	return characterDivImage;
	
	
}

	
	
	
function createCharacterImageDivPlayer(id, name, tempSelectedCharacter, isReady){
	
	var characterDivImage = document.createElement("div");
	characterDivImage.setAttribute("id","characterDivImage_"+id);
	characterDivImage.classList.add("customImageDisplay");
	var playerCanvas=createCharacterImageCanvas(id, name ,tempSelectedCharacter);
	characterDivImage.appendChild(playerCanvas);

	
	var characterName=document.createElement("span"); 
	characterName.setAttribute("id","playerNameTag_"+id);
	characterName.classList.add("playerNameTag");
	characterName.classList.add("neonwhite");
	characterName.innerHTML=name;
	characterDivImage.appendChild(characterName);
	
	var characterReady=document.createElement("span"); 
	//characterReady.setAttribute("id","playerReadyTag_"+id);
	characterReady.classList.add("playerReadyTag");
	if (isReady){
		characterReady.classList.add("neonwhite");
		characterReady.classList.add("neonborder");
		characterReady.innerHTML="     ready     ";
	} else {
		characterReady.classList.add("neongrey");
		characterReady.classList.add("neonborder");
		characterReady.innerHTML="not ready";
	}
	
	characterDivImage.appendChild(characterReady);
	
	
	

	return characterDivImage;
	
}

function renderLogo(){
	var logoDiv=document.createElement("div");
	logoDiv.setAttribute("id","gameLogoDiv");
	logoDiv.classList.add("gameLogo");
	logoDiv.classList.add("neongreen");
	middle.appendChild(logoDiv);
	
	//var middle= document.getElementById("middle");
	//logoDiv.innerHTML="CooK  A  LooR";

	if (GAME_NAME == "Tetrys") {
		logoDiv.innerHTML="TETRYS";
	} else {
		var logoImg= document.createElement("img");
		logoImg.src="/static/"+GAME_NAME+"/images/gameLogo.png";
		logoDiv.appendChild(logoImg);
	}
		
}





function drawMyCharacterSelection(){
	deleteGuiElement("characterDivImage_draft");
	var characterSelectionDivMiddle = document.getElementById("characterSelectionDivMiddle");
	//var characterSelectionDivImage = document.createElement("canvas");

	var characterDivImage= createCharacterImageDivDraft("draft","", getMySelectedCharacter());

	characterSelectionDivMiddle.appendChild(characterDivImage);
	
}


function deleteGuiElement(IdToBeDeleted) {
  var toBeDeleted = document.getElementById(IdToBeDeleted);
  while (toBeDeleted) {
    if (toBeDeleted) {
      toBeDeleted.parentElement.removeChild(toBeDeleted);
    }
    var toBeDeleted = document.getElementById(IdToBeDeleted);
  }
}

function deleteGuiElementContents(IdToCleared) {
	var toBeCleared = document.getElementById(IdToCleared);
	if (toBeCleared){
		toBeCleared.innerHTML="";
	}
}


function clearBoard() {
    deleteGuiElementContents("middle");

    var leaveGameButton = document.getElementById("leaveGameButton");
    if (leaveGameButton) {
        leaveGameButton.style.display = "block";
    }
}






function getMySelectedCharacter(){
	if(selectedCharacter==undefined){
		selectedCharacter={color: null};
	}

	if (selectedCharacter.color==null){
		var tempName = getUserName();
		selectedCharacter.color=colorFromName(tempName);
	}

	return selectedCharacter;
}

function colorFromName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
    }

    const min = 20;
    const max = 230;
    const range = max - min + 1;

    return [
        min + ( hash        & 0xFF) % range,
        min + ((hash >> 8)  & 0xFF) % range,
        min + ((hash >> 16) & 0xFF) % range
    ];
}

function createCharacterImageCanvas(id, name, myCharacter){
	

	var canvas = document.createElement("canvas");
	if(id=="draft"){
		canvas.classList.add("characterCanvasDraft");
	}
	else{
		canvas.classList.add("characterCanvas");
	}

	var w = gameSettings.tileSizeW;
	var h = gameSettings.tileSizeH;


	canvas.width = w*2;
	canvas.height = h*3;
	canvas.setAttribute("id","characterCanvas_"+id);
	var context = canvas.getContext('2d');
	context.beginPath();

	var borderThickness=2;
	var borderColor="#000000";

	var matrix = [
		[1,0],
		[1,1],
		[1,0]
	];

	for(var y=0;y<3;y++){
		for(var x=0;x<2;x++){
			if (matrix[y][x]==1){
			//Border:
			context.fillStyle = borderColor;
			context.fillRect((x*w), (y*h), w, h);
			//Filling:
			context.fillStyle = Tools.RGBToHex(myCharacter.color);
			context.fillRect((x*w)+borderThickness, (y*h)+borderThickness, w-(borderThickness*2), h-(borderThickness*2));
			}
		}
	}

	return canvas;

}

function drawGameLobby(){
	console.log("drawgamelobby");
	//clearGameLobby();
	clearBoard();
	deleteGuiElement("postGameScreen");
	
	renderLogo();
	
	var lobbyDiv=document.createElement("div");
	lobbyDiv.setAttribute("id","lobbyDiv");
	lobbyDiv.classList.add("lobbyDiv");
	
	var middle= document.getElementById("middle");
	middle.appendChild(lobbyDiv);

	////draw highscore if exists
	var highscorediv=document.createElement("div");
	highscorediv.classList.add("highscores");
	if ( isMeHost()){
		highscorediv.style.setProperty("display", "block", "important");
		lobbyDiv.style.setProperty("display", "grid", "important");
	}
	
	if (gameState && gameState.highScores){
		for (var i=0; i<gameState.highScores.length;i++){
			var oneHighscoreDiv = document.createElement("div");
			oneHighscoreDiv.innerHTML= gameState.highScores[i];
			oneHighscoreDiv.innerHTML = `
					<span>${i+1}.</span>
					<span>${getUserNameById(gameState.highScores[i].userId)}</span>
					<span>${gameState.highScores[i].score}</span>
				`;
			if (i == 0){
				oneHighscoreDiv.classList.add("firstplace");
				oneHighscoreDiv.classList.add("neonwhite");
				oneHighscoreDiv.classList.add("neonborder");
			}
			highscorediv.appendChild(oneHighscoreDiv);
			
		}
		middle.appendChild(highscorediv);
	}
	
	
	var buttonDiv=document.createElement("div");
	buttonDiv.setAttribute("id","buttonDiv");
	buttonDiv.classList.add("buttonDiv");
	middle.appendChild(buttonDiv);



	if (! isMeHost()){
		var joinGameButton=document.createElement("button");
		joinGameButton.setAttribute("id","joinGameButton");
		joinGameButton.innerHTML = "JOIN";
		joinGameButton.classList.add("joinGameButton");
		joinGameButton.classList.add("neonborder");
		joinGameButton.classList.add("neonbutton");
		joinGameButton.classList.add("neongreen");
		joinGameButton.style.zIndex=1000;
		buttonDiv.appendChild(joinGameButton);

		if (!Tools.isElementInList(gameState.players,"userId",userId)){
			joinGameButton.style.display="block";
			joinGameButton.addEventListener('click', function(event) {

				var newTeamNr=1;
				joinGame(newTeamNr, getMySelectedCharacter());
			});	
			if(gameSettings.maxAmountPlayers > gameState.players.length){
				joinGameButton.disabled=false;
			}
			else{
				joinGameButton.disabled=true;
			}
			
		}else{
			joinGameButton.style.display="none";
		}
	}


	for(var i=1;i<gameSettings.teams;i++){
		var teamblock=document.createElement("div");
		teamblock.setAttribute("id","teamblock"+i);
		teamblock.classList.add("teamblock");
		if (i%2 == 0){
			teamblock.classList.add("themeRed");
		}
		else{
			teamblock.classList.add("themeBlue");
		}

		var playerPicsContainer=document.createElement("div");
		playerPicsContainer.classList.add("playerPicsContainer");
		var playerPics=createTeamDiv(gameState.players, i);
		playerPicsContainer.appendChild(playerPics);
		teamblock.appendChild(playerPicsContainer);
		lobbyDiv.appendChild(teamblock);
		
	}
	
	var canvasWrapper = document.getElementById("canvasWrapper");
	canvasWrapper.style.display = "none";

	var gameScore = document.getElementById("gameScore");
	gameScore.style.display = "none";
	
	var middle = document.getElementById("middle");
	middle.style.display = "block";
	
	//if i am not a player myself yet, show me character selection.
	if(!Tools.isElementInList(gameState.players,"userId",userId)){
		drawCharacterSelection();
	} else {

		var characterSelectionDiv=document.createElement("div");
		characterSelectionDiv.setAttribute("id","characterSelectionDiv");
		characterSelectionDiv.classList.add("characterSelection");
		buttonDiv.appendChild(characterSelectionDiv);
		
		var leavePlayersButton=document.createElement("button");
		leavePlayersButton.setAttribute("id","leavePlayersButton");
		if (GAME_NAME == "Tetrys"){
			leavePlayersButton.innerHTML = "Leave";
		} else {
			leavePlayersButton.innerHTML = "Edit Character";
		}
		leavePlayersButton.classList.add("editCharacterButton");
		leavePlayersButton.classList.add("neonborder");
		leavePlayersButton.classList.add("neonbutton");
		leavePlayersButton.classList.add("neongreen");
		leavePlayersButton.addEventListener('click', function(event) {
			leavePlayers();
		});		
		buttonDiv.appendChild(leavePlayersButton);

		var readyButton=document.createElement("button");
		readyButton.setAttribute("id","readyButton");
		readyButton.innerHTML = isPlayerReady ? "Unready" : "Ready";
		readyButton.classList.add("readyButton");
		readyButton.classList.add("neonborder");
		readyButton.classList.add("neonbutton");
		readyButton.classList.add("neongreen");
		readyButton.addEventListener('click', function(event) {
		 	toggleReady();
		readyButton.innerHTML = isPlayerReady ? "Unready" : "Ready";
			
		 });		
		buttonDiv.appendChild(readyButton);	
	}



}
function drawCharacterSelectionLeft(docelement){
	//left not needed
}


function drawCharacterSelectionMiddle(docelement){
	
	var colorPicker=document.createElement("input");
	colorPicker.classList.add("customPickerLeft");
	colorPicker.setAttribute("type","color");
	colorPicker.setAttribute("id","ColorPicker");
	docelement.appendChild(colorPicker);
	
	colorPicker.setAttribute("value",Tools.RGBToHex(getMySelectedCharacter().color));
		colorPicker.addEventListener("change", function(){
			selectedCharacter.color = Tools.hexToRGB(document.getElementById('ColorPicker').value);
		}, false);
	
}

function drawCharacterSelectionRight(docelement){
	
	//right not needed
	
}

function enableScroll() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    
    window.removeEventListener('scroll', preventDefault, { passive: false });
    window.removeEventListener('wheel', preventDefault, { passive: false });
    window.removeEventListener('touchmove', preventDefault, { passive: false });
    document.removeEventListener('keydown', preventDefaultForScrollKeys, { passive: false });
}

function disableScroll() {
    window.addEventListener('scroll', preventDefault, { passive: false });
    window.addEventListener('wheel', preventDefault, { passive: false });
    window.addEventListener('touchmove', preventDefault, { passive: false });
    document.addEventListener('keydown', preventDefaultForScrollKeys, { passive: false });
}

function preventDefault(e) {
    e.preventDefault();
}

function preventDefaultForScrollKeys(e) {
    if ([32, 33, 34, 35, 36, 37, 38, 39, 40].includes(e.keyCode)) {
        e.preventDefault();
    }
}
