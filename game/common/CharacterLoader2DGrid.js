(function(exports) { 

var fs = require("fs");
var path= require("path");
var Tools = require('./../../static/common/tools.js');	



var IMG_FILE_EXTENSION=".png";



class CharacterLoader2DGrid{


	constructor() { 
		//should be empty
	}	
	

	/**
	STATIC PART
	**/

	static customHats=[];
	static customFaces=[];
	static customBodies=[];
	

	static initialize(){
		
		CharacterLoader2DGrid.initCustomLooks();	
	}

	
	static initCustomLooks(){

		CharacterLoader2DGrid.customHats=[];
		//read hat images
		var folderName="./static/common/images/Character2D/hats/";
		var models = Tools.getFolderNamesInFolder(fs,path,folderName);
		for(var i=0;i<models.length;i++){
			var current={id: i, name: models[i]};
			CharacterLoader2DGrid.customHats.push(current);
		}
		
		CharacterLoader2DGrid.customFaces=[];
		//read face images
		var folderName="./static/common/images/Character2D/faces/";
		var models = Tools.getFolderNamesInFolder(fs,path,folderName);
		for(var i=0;i<models.length;i++){
			var current={id: i, name: models[i]};
			CharacterLoader2DGrid.customFaces.push(current);
		}
			
		CharacterLoader2DGrid.customBodies=[];
		//read bodies images
		var folderName="./static/common/images/Character2D/bodies/";
		var models = Tools.getFolderNamesInFolder(fs,path,folderName);
		for(var i=0;i<models.length;i++){
			var current={id: i, name: models[i]};
			CharacterLoader2DGrid.customBodies.push(current);
		}
		
	}
	
}


module.exports = CharacterLoader2DGrid;
     
})(typeof exports === 'undefined'?  
            window: exports); 