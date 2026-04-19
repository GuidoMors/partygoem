/*Script for general client-Side functions*/


/** general VARIABLES**/

var gameState;
var gameId;

//tied to the start game button; Start The Game when in Lobby Phase. Should only be pressed by admin.
function startGame(){
	socket.emit(GAME_NAME+"_startGame"+gameId);	
}

function finishGame(){
	socket.emit(GAME_NAME+"_finishGame"+gameId);	
}


//returns the player variable of the player of this browser
function getMeAsPlayer(){
	
	for(var i=0;i<gameState.players.length;i++){
		if(gameState.players[i].userId==userId){
			return gameState.players[i];
		}
	}
	return null;
}

//returns true if this browser is a player inside of gamestate and false otherwise
function isMePlayer(){
	return getMeAsPlayer() != null;
}

//returns true if this browser is host and false otherwise
function isMeHost(){
	return gameState.host==userId;
}

//this browser asks to join the game with the selected character. myCharacter is a game Specific variable!!
function joinGame(team, myCharacter){
	socket.emit(GAME_NAME+"_joinPlayer"+gameId, userId, team, myCharacter);
}

function setTeams(amount){
	socket.emit(GAME_NAME+"_setTeams"+gameId, amount);
}

function changeTeam(newTeamNr){
	socket.emit(GAME_NAME+"_playerChangeTeam"+gameId, userId, newTeamNr);
	
}

function leavePlayers(){
	socket.emit(GAME_NAME+"_leavePlayer"+gameId, userId);
	
}
