///////////////////////////////////////////
// JS File for useful generic Functions
//////////////////////////////////////////
(function(exports) {



/**
	Function that checks whether there is an element in the list <list> that has an attribute <attribute> with value = <value>.
	if attribute is empty (""), it checks whether value is directly contained in the list. 
**/
exports.isElementInList = function(list, attribute, value){
	for(var i=0;i<list.length;i++){
		if((attribute=="" && list[i]== value) || (list[i][attribute]==value)){
			return true;
		}
	}
	return false;

}
exports.isListEqualOrdered = function(list1, list2, attribute){
	
	if(list1.length != list2.length){
		return false;
	}
	for(var i=0;i<list1.length;i++){
		if(!((attribute=="" && list1[i]==list2[i]) || (list1[i][attribute]==list2[i][attribute]))){
			return false;
		}
	}
	return true;
}

exports.isListEqualIngoreOrder = function(list1, list2, attribute){

	if(list1.length != list2.length){
		return false;
	}
	var listTemp=copy(list1);
	
	for(var i=0;i<list1.length;i++){
		var found=false;
		for(var j=0;j<listTemp.length;j++){
			if(((attribute=="" && list1[i]==list2[i]) || (list1[i][attribute]==list2[i][attribute]))){
				listTemp.splice(j,1);
				found=true;
			}
			
		}
		if(!found){
			return false;
		}
		
	}
	return true;
}


exports.sortList = function(list, attribute, ascending){
	 list.sort((a, b) => (a[attribute] > b[attribute] && ascending) ? 1  : -1);
	return list;
}



/**
	Function that randomly scrambles a list (changes the order of the elements).
**/
exports.scrambleList = function(list){
	for (var i = 0; i < list.length; i++) {
		var random = Math.floor(Math.random()*(list.length));
		var store = list[i];
		list[i] = list[random];
		list[random] = store;
	}
	return list;
}

/**

**/
exports.generateRandomString = function(length){
	var randomString= Math.random().toString(36).substr(2, length);
	return randomString

}
/**

**/
exports.getTimeDifferenceInDays = function(date1, date2){	
	var t1=new Date(date1);
	var t2=new Date(date2);
	var differenceInMs= t1 - t2;
	var differenceInDays=parseInt((differenceInMs)/(24*3600*1000));
    return Math.floor(differenceInDays);
}
/**

**/
exports.getTimeDifferenceInHours = function(date1, date2){
	var t1=new Date(date1);
	var t2=new Date(date2);
	var differenceInMs= t1 - t2;
	var differenceInMs= date1 - date2;
	var differenceInDays=parseInt((differenceInMs)/(3600*1000));
    return Math.floor(differenceInDays);
}
/**

**/
exports.getTimeDifferenceInMinutes = function(date1, date2){
	var t1=new Date(date1);
	var t2=new Date(date2);
	var differenceInMs= t1 - t2;
	var differenceInMins= differenceInMs/(60*1000);
    return Math.floor(differenceInMins);
}
/**
 Function that turns a given amount of seconds into a string representation of time, i.e. "4:04".
**/
exports.getTimeAsString = function(seconds){ 
	var timertext = Math.floor(seconds/60);
	if (Math.floor(seconds%60) < 10){
		timertext = timertext + ":0" + Math.floor(seconds%60);
	} else {
		timertext = timertext + ":" + Math.floor(seconds%60);
	}
	return timertext
}



/**

**/
exports.getRandomInt = function(max){ //returns between 0...max
	return Math.floor(Math.random() * max);
}
/**

**/
exports.getRandomEntryFromList = function(list){ //returns between 0...max
	var randomIndex=exports.getRandomInt(list.length);
	return list[randomIndex];

}
/**

**/
exports.hexToRGB = function(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
	var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);

	return [r,g,b];
}
/**

**/
exports.RGBToHex = function(rgb) {
	return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
  }

/**
	makes a copy of the given object.
**/
exports.copy = function(object){
	return JSON.parse(JSON.stringify(object));
}

/**
	Function that calculates the distance between two points x1,y1 and x2,y2
**/
exports.calcDistance = function(x1,y1, x2,y2){
	var dX=x2-x1;
	var dY=y2-y1;
	var distance=Math.sqrt(dX*dX + dY*dY);
	
	return distance;
	
}

/**

**/
exports.createMatrix=function(  cols,rows , defaultValue){
		var arr = [];
		// Creates all lines:
		for(var i=0; i < rows; i++){
			// Creates an empty line
			arr.push([]);
			// Adds cols to the empty line:
			arr[i].push( new Array(cols));
			for(var j=0; j < cols; j++){
				// Initializes:
				arr[i][j] = defaultValue;
			}
		}
		return arr;
	}
/**

**/
exports.printMatrix=function(matrix, attributeToShow){
		var result="[";
		for(var y=0; y < matrix.length;y++){
			result=result+"[";
				for(var x=0; x<matrix[y].length;x++){
					if(x>0){
						result=result+" , ";
					}
					result=result+ matrix[y][x][attributeToShow];
					
				}
				result=result+"]\n";
		}
		console.log(result);
	}



/**

**/	
exports.isPointWithinRectangle=function(posX, posY,x,y,w,h){
		
		var overlappingX=posX >= x && posX<= (x+w);
		var overlappingY=posY >= y && posY<= (y+h);
		return overlappingX && overlappingY;
	}	
	
	
/**
	Checks whether 2 rectangle collide / intersect. that happens when one of the 4 corners of the first rectangle is inside of the other rectangle.
**/
exports.isCollision=function(x1,y1,w1,h1, x2,y2,w2,h2){
	
		//check upper left
		if(exports.isPointWithinRectangle(x1,y1,x2,y2,w2,h2)){
			return true;
		}
		//check upper right
		if(exports.isPointWithinRectangle(x1+w1,y1,x2,y2,w2,h2)){
			return true;
		}
		//check lower left
		if(exports.isPointWithinRectangle(x1,y1+h1,x2,y2,w2,h2)){
			return true;
		}
		//check lower right
		if(exports.isPointWithinRectangle(x1+w1,y1+h1,x2,y2,w2,h2)){
			return true;
		}
		return false;
	}	
/**
	
**/
exports.isCollisionCorner=function(x1,y1,w1,h1, x2,y2,w2,h2){
	
		//check upper left
		if(exports.isPointWithinRectangle(x1,y1,x2,y2,w2,h2)){
			return {x:x1,y:y1};
		}
		//check upper right
		if(exports.isPointWithinRectangle(x1+w1,y1,x2,y2,w2,h2)){
			return {x:x2,y:y1};
		}
		//check lower left
		if(exports.isPointWithinRectangle(x1,y1+h1,x2,y2,w2,h2)){
			return {x:x1,y:y2};
		}
		//check lower right
		if(exports.isPointWithinRectangle(x1+w1,y1+h1,x2,y2,w2,h2)){
			return {x:x2,y:y2};
		}
		return undefined;
	}	
	
	
/** 
	returns the list of folder names inside of a specific folder.
	!!! only used by serverside because of the required fs parameter (require(fs) must be given as parameter)
**/
exports.getFolderNamesInFolder=function(fs,path,relativePath){	
		var result= fs.readdirSync(relativePath).filter(function(file) { 
															return fs.statSync(path.join(relativePath, file)).isDirectory(); 
														});					
		return result;
	}	
	
	
		
})(typeof exports === 'undefined'? this['Tools']={}:  exports); 
			





