///////////////////////////////////////////
// Helper with generating HTML
//////////////////////////////////////////

function conjureElement(type, parent, myId, modifier){
	if (!myId){
		var element = document.createElement(type);
		parent.appendChild(element);
		return element;
	}
	if (!modifier){
		var element = document.getElementById(myId);
	} else {
		var element = document.getElementById(myId+'-'+modifier);
	}
	
	if (!element){
		element = document.createElement(type);
		element.classList.add(myId);
		if (!modifier){
			element.id = myId;
		} else {
			element.id = myId+'-'+modifier;
		}
		parent.appendChild(element);
	}

	return element;
}

function conjureClass(element, cssClasses){
	var cssClasses = cssClasses.split(' ');

	for (var i = 0; i < cssClasses.length; i++) {
		if (!element.classList.contains(cssClasses[i])){
			element.classList.add(cssClasses[i]);
		}
	}
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
  