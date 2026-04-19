/*Script for general client-Side functions*/

var movement = {
	up: false,
	down: false,
	left: false,
	right: false
  }

var isMouseDown=false;
var tappedTwice = false;
var doubleClicked = true;
var checkingForDoubleClick = false;
var hasSendAction = false;
var MOUSE_MOD=20;
var doubleTapDelay = 100; //the miliseconds delay between registering a double tap or starting
var directionList = ["front","top","left","right","topright","frontright","topleft","frontleft"];
var mouseMoveIntervalOn = false;
var initializedControlListeners = {};

var overlayCanvas = document.getElementById("overlayCanvas");

document.addEventListener('DOMContentLoaded', function() {
	var body = document.body;
	body.addEventListener('keydown', function(event) {
		var chatbox = document.getElementById('inputMessage');
		var focused = document.activeElement;
		if(!focused || focused !=chatbox){

			switch (event.keyCode) {
			case 37:
			case 65: // A
				if(!movement.left){
					movement.left = true;
					sendStateToServer();
				}
				break;
			case 38:
			case 87: // W
				if(!movement.up){
					movement.up = true;
					sendStateToServer();
				}
				break;
			case 39:
			case 68: // D
				if(!movement.right){
					movement.right = true;
					sendStateToServer();
				}
				break;
			case 40:
			case 83: // S
				if(!movement.down){
					movement.down = true;
					sendStateToServer();
				}
				break;
			case 32: // Space
					event.preventDefault();
					sendActionButtonToServer(null);
				
				break;
			case 27: // ESC
					event.preventDefault();
					sendPauseButtonToServer();
				
				break;
			}
		}
	});

	//listens to a key release and sends it to the server
	body.addEventListener('keyup', function(event) {
		var chatbox = document.getElementById('inputMessage');
		var focused = document.activeElement;
		if(!focused || focused !=chatbox){
			switch (event.keyCode) {
				
				case 37:
				case 65: // A
					if(movement.left){
						movement.left = false;
						sendStateToServer();
					}
					break;
				case 38:
				case 87: // W
					if(movement.up){
						movement.up = false;
						sendStateToServer();
					}
					break;
				case 39:
				case 68: // D
					if(movement.right){
						movement.right = false;
						sendStateToServer();
					}
					break;
				case 40:
				case 83: // S
					if(movement.down){
						movement.down = false;
						sendStateToServer();
					}
					break;

				/*  case 32: // Space
						event.preventDefault();
						sendActionButtonToServer(null);
					
					break;*/
			}
		}
	});  

	var buttons = document.querySelectorAll('button');
	buttons.forEach(button => {
		const onclick = button.getAttribute('misc');
		if (onclick && onclick.includes("sendAction")) {
			initActionButtonEvents(button, button.getAttribute('value'));
		}
	});
});

//takes the current state of ASDW key presses of this browser and sends it to the server
function sendStateToServer(){	
	if(gameState.isRunning){
		socket.emit(GAME_NAME+"_updatePlayerMovement"+gameId, movement, userId);
	}
}

//takes the current state of the space key press and sends it to the server
function sendActionButtonToServer(direction){	
	if (!hasSendAction) {
		if(gameState.isRunning ){	
			socket.emit(GAME_NAME+"_attemptPlayerAction"+gameId, userId, direction);
			hasSendAction = true;
			setTimeout(() => {
				hasSendAction = false;
			}, doubleTapDelay);
		}
	}
}
function sendPauseButtonToServer(){	
	if(gameState.isRunning && isMeHost() ){
		socket.emit(GAME_NAME+"_attemptPauseAction"+gameId, userId);
	}
}

//returns true if this browsers character is moving in a direction or not (moving in this case means having a ASDW key pressed down)
function isMoving(){
	return movement.up || movement.down || movement.left || movement.right;
}

//returns a string of the current direction of movement of the parameter movement
function getDirectionStringFromMovement(movement){
	var result="";
	if(movement.left){
		result="left";
	}
	if(movement.right){
		result="right";
	}	
	if(movement.up){
		result="top";
	}	
	if(movement.down){
		result="front";
	}	
	if(movement.left && movement.up){
		result="topleft";
	}
	if(movement.right && movement.up){
		result="topright";
	}	
	if(movement.left && movement.down){
		result="frontleft";
	}	
	if(movement.right && movement.down){
		result="frontright";
	}
	return result;	
}

function initMouseDownEvent(){
	isMouseDown=true;
}

function initMouseUpEvent(event, type){
	isMouseDown=false;	
	movement.left=false;
	movement.right=false;
	movement.up = false;
	movement.down = false;	
	sendStateToServer();

	var direction = getDirectionFromTapLocation(event, type);
	if (direction) {
		socket.emit(GAME_NAME+"_updatePlayerDirection"+gameId, direction, userId);
	}
}

function initMouseMoveEvent(event, type){

	if(isMouseDown){
		var me = quickGameState.players[userId];
		if (!me) {return;}

		if (type != 'controller'){
			var pos = getMouseCoordsOnCanvas(event);
			if (pos.x != NaN && pos.y != NaN){
				var canvas = document.getElementById('canvas');
				var context = canvas.getContext("2d");
				context.beginPath();
				context.arc(pos.x, pos.y, 5, 0, 2 * Math.PI);
				context.fill();
			}
		}

		var direction = getDirectionFromTapLocation(event, type);
		if (direction != null){
			movement = direction;
		}
		if (!mouseMoveIntervalOn){
			mouseMoveInterval();
		}
		
	}
}

function mouseMoveInterval(){
	mouseMoveIntervalOn = true;
	sendStateToServer();
	setTimeout(function(){
		if (isMouseDown){
			mouseMoveInterval();
		} else {
			mouseMoveIntervalOn = false;
		}
	},  130);
}

function initActionButtonEvents(button, value){

	button.addEventListener('mousedown', function() {
		event.preventDefault();
		sendAction(value);
	});

	button.addEventListener('mouseup', function() {
		event.preventDefault();
		sendAction('none');
	});

	button.addEventListener('touchstart', function() {
		event.preventDefault();
		sendAction(value);
	});

	button.addEventListener('touchend', function() {
		event.preventDefault();
		sendAction('none');
	});


	button.addEventListener('mousemove', function(event) {
		event.preventDefault();
	}, false);
	button.addEventListener('click', function(event) {
		event.preventDefault();
	}, false);
	button.addEventListener('dblclick', function(event) {
		event.preventDefault();
	}, false);
	button.addEventListener('touchmove', function(event) {
		event.preventDefault();
	}, false);
	button.addEventListener('touchcancel', function(event) {
		event.preventDefault();
	}, false);
}

function initClickEvents(type){

	if (initializedControlListeners[type+"-click"]){
		return
	}
	initializedControlListeners[type+"-click"] = true;

	if (type == "controller"){
		var listener = document.getElementById('radialController');
	} else {
		var listener = document.getElementById('canvas');
	}
	
	listener.addEventListener('mousedown', function(event) {
		event.preventDefault();
		if (!checkingForDoubleClick) {
			checkingForDoubleClick = true;
			doubleClicked = false;
			setTimeout(() => {
				if (!doubleClicked) {
					initMouseDownEvent();
				}
				checkingForDoubleClick = false;
				doubleClicked = false;
			}, doubleTapDelay);
		}
	}, false);

	listener.addEventListener('mouseup', function(event) {
		doubleClicked = true;
	}, false);

	listener.addEventListener('mousemove', function(event) {
		event.preventDefault();
		initMouseMoveEvent(event, type);
	}, false);

	listener.addEventListener('click', function(event) {
		event.preventDefault();
		doubleClicked = true;
		var chatbox = document.getElementById('inputMessage');
		if (chatbox){
			chatbox.blur();
		}
		initMouseUpEvent(event, type);
	}, false);
	
	listener.addEventListener('dblclick', function (event) {
		event.preventDefault();
		doubleClicked = true;
		var direction = getDirectionFromTapLocation(event, type);
		sendActionButtonToServer(direction);
	});
}

function disableDefaultEvents(){
	document.addEventListener('touchend', function(event) { event.preventDefault(); }, false);
	document.addEventListener('touchcancel', function(event) { event.preventDefault(); }, false);
	document.addEventListener('touchmove', function(event) { event.preventDefault(); }, false);
	document.addEventListener('touchstart', function(event) { event.preventDefault(); }, false);
}

function initTouchEvents(type) {

	if (initializedControlListeners[type+"-touch"]){
		return
	}
	initializedControlListeners[type+"-touch"] = true;
	
	if (type == "controller"){
		var listener = document.getElementById('radialController');
	} else {
		var listener = document.getElementById('canvas');
	}

    listener.addEventListener('touchstart', function(event) {
		event.preventDefault();

		var direction = getDirectionFromTapLocation(event, type);
		if (direction) {
			socket.emit(GAME_NAME+"_updatePlayerDirection"+gameId, direction, userId);
		}

		tapHandler(event, type);
		if (!checkingForDoubleClick) {
			checkingForDoubleClick = true;
			doubleTapped = false;
			setTimeout(() => {
				if (!doubleTapped) {
					initMouseDownEvent();
				}
				checkingForDoubleClick = false;
				doubleTapped = false;
			}, doubleTapDelay);
		}
    
    }, false);

    listener.addEventListener('touchend', function(event) {
	    event.preventDefault();
        doubleTapped = true;
        initMouseUpEvent(event, type);
    }, false);

    listener.addEventListener('touchmove', function(event) {
		event.preventDefault();
        initMouseMoveEvent(event, type);
    }, false);

    listener.addEventListener('touchcancel', function(event) {
        event.preventDefault();
		initMouseUpEvent(event, type);
    }, false);
}


function tapHandler(event, type) {
    if(tappedTwice == false) {
        tappedTwice = true;
        setTimeout( function() { tappedTwice = false; }, doubleTapDelay*3 );
    } else {
		tappedTwice = false;
		var direction = getDirectionFromTapLocation(event, type);
		sendActionButtonToServer(direction);	
	}
 }

function getDirectionFromTapLocation(event, type){

	if (type == 'controller'){
		var mouseCoords = getMouseCoordsOnRadialController(event);
		if (Math.abs(mouseCoords.x) < (MOUSE_MOD/2) && Math.abs(mouseCoords.y) < (MOUSE_MOD/2)){
			return null;
		}
	} else {
		var mouseCoords = getMouseCoordsOnCanvas(event);
		if (!quickGameState) { return null;}
		var me = quickGameState.players[userId];
		mouseCoords = {x: mouseCoords.x - me.x, y: mouseCoords.y - me.y};

		var canvas = document.getElementById('canvasWrapper');

		var ratio = parseInt(canvas.style.height)/1600;

		if (gameSettings){
			var yOffset = gameSettings.playerHandsHeightModifier*ratio;
		} else {
			var yOffset = 30*ratio;
		}
		 
		mouseCoords.y = mouseCoords.y + yOffset;

		if (Math.abs(mouseCoords.x) < MOUSE_MOD && Math.abs(mouseCoords.y) < MOUSE_MOD){
			return null;
		}
	}

	return getDirectionFromCoordinates(mouseCoords.x, mouseCoords.y);
 }

function getDirectionFromCoordinates(x, y){

	if (isNaN(x) || isNaN(y)) {
		return null;
	}

	if (y == 0) { y = 0.01;}

	var angleRadians = Math.atan2(x, y)+Math.PI;

	if (angleRadians <= 1.178 && angleRadians >= 0.393) {
		return {up: true, down: false, right: false, left: true};
	}

	if (angleRadians <= 1.963 && angleRadians >= 1.178) {
		return {up: false, down: false, right: false, left: true};
	}

	if (angleRadians <= 2.749 && angleRadians >= 1.963) {
		return {up: false, down: true, right: false, left: true};
	}

	if (angleRadians <= 3.534 && angleRadians >= 2.749) {
		return {up: false, down: true, right: false, left: false};
	}

	if (angleRadians <= 4.320 && angleRadians >= 3.534) {
		return {up: false, down: true, right: true, left: false};
	}

	if (angleRadians <= 5.105 && angleRadians >= 4.320) {
		return {up: false, down: false, right: true, left: false};
	}

	if (angleRadians <= 5.890 && angleRadians >= 5.105) {
		return {up: true, down: false, right: true, left: false};
	}

	return {up: true, down: false, right: false, left: false};
 }

function getMouseCoordsOnCanvas(event) {

    if (event) {
        var myX, myY;
        if (event.clientX !== undefined && event.clientY !== undefined) {
            myX = event.clientX;
            myY = event.clientY;
        }
        else if (event.touches && event.touches[0]) {
            myX = event.touches[0].pageX;
            myY = event.touches[0].pageY;
        }
    } else {
        return { x: NaN, y: NaN };
    }

	var canvaswrapper = document.getElementById('canvasWrapper');

	var ratioViewportWidth = window.visualViewport.width/parseInt(canvaswrapper.style.width);
	var ratioLeftOffsetViewport = -parseInt(canvaswrapper.style.left)/parseInt(canvaswrapper.style.width);
	var ratioViewportMyX = (myX/window.visualViewport.width)*ratioViewportWidth;
	var totalRatioWidth = ratioLeftOffsetViewport + ratioViewportMyX;
	var mapWidth = gameSettings.tileSizeW*gameState.map.grid[0].length;
	var x = mapWidth*totalRatioWidth;

	var ratioViewportHeight = window.visualViewport.height/parseInt(canvaswrapper.style.height);
	var ratioTopOffsetViewport = -parseInt(canvaswrapper.style.top)/parseInt(canvaswrapper.style.height);
	var ratioViewportMyY = (myY/window.visualViewport.height)*ratioViewportHeight;
	var totalRatioHeight = ratioTopOffsetViewport + ratioViewportMyY;
	var mapHeight = gameSettings.tileSizeH*gameState.map.grid.length;
	var y = mapHeight*totalRatioHeight;
	
	return { x: x, y: y };
    
}

function getMouseCoordsOnRadialController(event) {
    if (event) {
        var myX, myY;
        if (event.clientX !== undefined && event.clientY !== undefined) {
            myX = event.clientX;
            myY = event.clientY;
        }
        else if (event.touches && event.touches[0]) {
            myX = event.touches[0].pageX;
            myY = event.touches[0].pageY;
        }
    } else {
        return { x: NaN, y: NaN };
    }

	var controller = document.getElementById('radialController');

	var rect = controller.getBoundingClientRect();

    var centerX = rect.left + rect.width / 2;
    var centerY = rect.top + rect.height / 2;
    
    var x = myX- centerX;
    var y = myY- centerY;

	return { x: x, y: y };
}


function sendAction(type){
	movement = {left: false, right: false, down: false, up: false};
	if (type == 'right'){
		movement.right = true;
		sendStateToServer();
		return;
	}
	if (type == 'left'){
		movement.left = true;
		sendStateToServer();
		return;
	}
	if (type == 'up'){
		movement.up = true;
		sendStateToServer();
		return;
	}
	if (type == 'down'){
		movement.down = true;
		sendStateToServer();
		return;
	}
	if (type == 'none'){
		sendStateToServer();
	}
}
	