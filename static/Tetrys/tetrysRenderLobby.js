/*Script to render a game-specific lobby.*/



var selectedTeam=1;

var selectedCharacter;

function getReceivedSelectedCharacter(){
	return selectedCharacter;
}

//refresh html when new player connects // Press F5
socket.emit(GAME_NAME+"_requireCustomizations");		

socket.on(GAME_NAME+"_receiveCustomizations", function(customizationOptions, customCharacter){	
	customizationOptions=customizationOptions;
	selectedCharacter=customCharacter;
});

function removeLobby(){
	var middle = document.getElementById("middle");
	middle.style.display = "none";

	// var changeButton = document.getElementById("changeNameButton");
	// changeButton.style.display = "none";

	var swapButton = document.getElementById("swapTabButton");
	swapButton.style.display = "block";

	var wrapper = document.getElementById("canvasWrapper");
	wrapper.style.display = "block";
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
			var characterDivImage= createCharacterImageDivPlayer(i, getUserNameById(playerListToDraw[i].userId), playerListToDraw[i].selectedCharacter);
			playerPics.appendChild(characterDivImage);
		}
		
	}
	return playerPics;
	
}

function drawCharacterSelection(){

	deleteGuiElement("characterSelectionDiv");
	deleteGuiElement("startGameButton");

	if (isMeHost()){
		var startGameButton=document.createElement("button");
		startGameButton.setAttribute("id","startGameButton");
		startGameButton.innerHTML = "START";
		startGameButton.classList.add("startGameButton");
		startGameButton.classList.add("BigButton");

				startGameButton.addEventListener('click', function(event) {
			startGame();
		});	

		lobbyDiv.appendChild(startGameButton);	

		var lessTeamsButton =document.createElement("button");
		lessTeamsButton.setAttribute("id","lessTeamsButton");
		lessTeamsButton.innerHTML = "Teams--";
		lessTeamsButton.classList.add("teamChoosingButton");
		lobbyDiv.appendChild(lessTeamsButton);	

		var moreTeamsButton =document.createElement("button");
		moreTeamsButton.setAttribute("id","moreTeamsButton");
		moreTeamsButton.innerHTML = "Teams++";
		moreTeamsButton.classList.add("teamChoosingButton");
		lobbyDiv.appendChild(moreTeamsButton);	

					startGameButton.addEventListener('click', function(event) {
				startGame();
			});	
			lessTeamsButton.addEventListener('click', function(event) {
                if(gameSettings.teams >= 3){
				    setTeams(gameSettings.teams-2); //server adds one again for spectators
                }
			});	
			moreTeamsButton.addEventListener('click', function(event) {
				setTeams(gameSettings.teams);//server adds already 1 for spectators
			});	

	} else {
		var characterSelectionDiv=document.createElement("div");
		characterSelectionDiv.setAttribute("id","characterSelectionDiv");
		characterSelectionDiv.classList.add("characterSelection");
		lobbyDiv.appendChild(characterSelectionDiv);

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

//function drawCharacterSelectionLeft(docelement){}
//function drawCharacterSelectionMiddle(docelement){}
//function drawCharacterSelectionRight(docelement){}
//function createCharacterImageCanvas(id, name, selectedCharacter){}
//function getMySelectedCharacter();



function createCharacterImageDivDraft(id,name,selectedCharacter){
	var characterDivImage = document.createElement("div");
	characterDivImage.setAttribute("id","characterDivImage_"+id);
	if(id=="draft"){
		characterDivImage.classList.add("customImageDisplayDraft");
	}else{
		characterDivImage.classList.add("customImageDisplay");
	}
	var playerCanvas=createCharacterImageCanvas(id, name ,selectedCharacter);
	characterDivImage.appendChild(playerCanvas);
	
	var middle = document.getElementById("characterSelectionDivMiddle");
	var characterName = document.createElement("span"); 
	characterName.setAttribute("id","playerNameTag_"+id);
	characterName.classList.add("myPlayerNameTag");
	characterName.innerHTML=name;
	//draw/add them in correct order (first the one that is in the background)
	
	middle.appendChild(characterName);
	
	return characterDivImage;
	
	
}

	
	
	
function createCharacterImageDivPlayer(id, name,selectedCharacter){
	
	var characterDivImage = document.createElement("div");
	characterDivImage.setAttribute("id","characterDivImage_"+id);
	characterDivImage.classList.add("customImageDisplay");
	var playerCanvas=createCharacterImageCanvas(id, name ,selectedCharacter);
	characterDivImage.appendChild(playerCanvas);

	
	var characterName=document.createElement("span"); 
	characterName.setAttribute("id","playerNameTag_"+id);
	characterName.classList.add("playerNameTag");
	characterName.innerHTML=name;
	characterDivImage.appendChild(characterName);
	
	
	

	return characterDivImage;
	
}

function renderLogo(){
	var logoDiv=document.createElement("div");
	logoDiv.setAttribute("id","gameLogoDiv");
	logoDiv.classList.add("gameLogo");
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
	toBeCleared.innerHTML="";
}


function clearBoard() {
    deleteGuiElementContents("middle");

    var leaveGameButton = document.getElementById("leaveGameButton");
    if (leaveGameButton) {
        leaveGameButton.style.display = "block";
    }
}






function getMySelectedCharacter(){
	var selectedCharacter=getReceivedSelectedCharacter();
	if(selectedCharacter==undefined){
		selectedCharacter={color: [10,100,255]};
	}

	return selectedCharacter;
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
	//clearGameLobby();
	clearBoard();
	deleteGuiElement("postGameScreen");
	
	renderLogo();
	
	var lobbyDiv=document.createElement("div");
	lobbyDiv.setAttribute("id","lobbyDiv");
	lobbyDiv.classList.add("lobbyDiv");
	
	var middle= document.getElementById("middle");
	middle.appendChild(lobbyDiv);
	middle.style.display = "block";

	for(var i=1;i<gameSettings.teams;i++){
		var teamblock=document.createElement("div");
		teamblock.setAttribute("id","teamblock"+i);
		teamblock.classList.add("teamblock");
		teamblock.style.width = 100/(gameSettings.teams-1)+"%";
		if (i%2 == 0){
			teamblock.classList.add("themeRed");
			
		}
		else{
			teamblock.classList.add("themeBlue");
		}

		if (! isMeHost()){
			var joinGameButton=document.createElement("button");
			joinGameButton.setAttribute("id","joinGameButton_"+i);
			joinGameButton.innerHTML = "JOIN";
			joinGameButton.classList.add("joinGameButton");
			if (!Tools.isElementInList(gameState.players,"userId",userId)){
				joinGameButton.addEventListener('click', function(event) {
					var newTeamNr=event.srcElement.id.replace("joinGameButton_","");
					joinGame(newTeamNr, getMySelectedCharacter());
				});		
			}else {
				joinGameButton.addEventListener('click', function(event) {
					var newTeamNr=event.srcElement.id.replace("joinGameButton_","");
					changeTeam(newTeamNr); // just "i" didnt work, always defaulted i 3.
				});
			}
			teamblock.appendChild(joinGameButton);
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
	
	//if i am not a player myself yet, show me character selection.
	if(!Tools.isElementInList(gameState.players,"userId",userId)){
		drawCharacterSelection();
	} else {

		var characterSelectionDiv=document.createElement("div");
		characterSelectionDiv.setAttribute("id","characterSelectionDiv");
		characterSelectionDiv.classList.add("characterSelection");
		lobbyDiv.appendChild(characterSelectionDiv);
		
		var leavePlayersButton=document.createElement("button");
		leavePlayersButton.setAttribute("id","leavePlayersButton");
		if (GAME_NAME == "Tetrys"){
			leavePlayersButton.innerHTML = "Pick Color";
		} else {
			leavePlayersButton.innerHTML = "Edit Character";
		}
		leavePlayersButton.classList.add("editCharacterButton");
		leavePlayersButton.addEventListener('click', function(event) {
			leavePlayers();
		});		
		characterSelectionDiv.appendChild(leavePlayersButton);

		var startGameButton=document.createElement("button");
		startGameButton.setAttribute("id","startGameButton");
		startGameButton.innerHTML = "START";
		startGameButton.classList.add("startGameButton");
		startGameButton.classList.add("BigButton");
		lobbyDiv.appendChild(startGameButton);	
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
	
	colorPicker.setAttribute("value",Tools.RGBToHex(selectedCharacter.color));
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
