/*
 * Copyright (c) 2014 - Copyright holders CIRSFID and Department of
 * Computer Science and Engineering of the University of Bologna
 * 
 * Authors: 
 * Monica Palmirani – CIRSFID of the University of Bologna
 * Fabio Vitali – Department of Computer Science and Engineering of the University of Bologna
 * Luca Cervone – CIRSFID of the University of Bologna
 * 
 * Permission is hereby granted to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The Software can be used by anyone for purposes without commercial gain,
 * including scientific, individual, and charity purposes. If it is used
 * for purposes having commercial gains, an agreement with the copyright
 * holders is required. The above copyright notice and this permission
 * notice shall be included in all copies or substantial portions of the
 * Software.
 * 
 * Except as contained in this notice, the name(s) of the above copyright
 * holders and authors shall not be used in advertising or otherwise to
 * promote the sale, use or other dealings in this Software without prior
 * written authorization.
 * 
 * The end-user documentation included with the redistribution, if any,
 * must include the following acknowledgment: "This product includes
 * software developed by University of Bologna (CIRSFID and Department of
 * Computer Science and Engineering) and its authors (Monica Palmirani, 
 * Fabio Vitali, Luca Cervone)", in the same place and form as other
 * third-party acknowledgments. Alternatively, this acknowledgment may
 * appear in the software itself, in the same form and location as other
 * such third-party acknowledgments.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/**
 * This controller contains the logic of the interaction
 * between the editor and the buttons used to mark the document
 * (and viceversa). There are two main operations: wrapping and splitting.
 * The first one wraps the selected element(s) inside of the element we
 * want to add while the second provides a way to split a selected
 * block/container in two (or more) different blocks/containers.
 * Inlines and markers beahave the same either for wrapping and splitting
 * operations.
 */
Ext.define('LIME.controller.Marker', {

	// extend the ext controller
	extend : 'Ext.app.Controller',

	// set up the views
	views : ['main.Editor'],

	refs : [{
		ref : 'contextMenu',
		selector : 'contextMenu'
	}],

	/**
	 * This method returns a well formed unique id for the marked element.
	 * For more information about the button id see {@link Ext.view.markingmenu.TreeButton}
	 * @param {String} buttonId The id of the button that was used to mark the element
	 * @returns {String} The unique id
	 */
	getMarkingId : function(buttonId) {
		var markedElements = DocProperties.markedElements, 
			partialId = buttonId + DomUtils.elementIdSeparator,
			counter = 1;
		for (counter; markedElements[partialId + counter]; counter++);
		return partialId + counter;
	},

	/**
	 * This function builds an id attribute starting from the given element's markingId.
	 * The build process is based on the hierarchy of the elements.
	 * The difference between this and {@link LIME.controller.Marker#getMarkingId} is that this id is
	 * specific to the language plugin currently in use while the latest is for development purposes.
	 * @param {HTMLElement} markedElement The element we have to set the attribute to
	 * @param {String} buttonId The id of the button that was used to mark the element
	 * @param {String} [prefix] The prefix for the attribute
	 * @returns {String} The language element unique id
	 */
	getLanguageMarkingId : function(markedElement, buttonId, prefix) {
		var newId = buttonId.replace(DomUtils.vowelsRegex, ''), counter = markedElement.getAttribute(DomUtils.elementIdAttribute).split(DomUtils.elementIdSeparator)[1],
		/* Retrieve all the parent nodes' ids */
		iterator = markedElement, parent = DomUtils.getFirstMarkedAncestor(iterator.parentNode);
		if (parent) {
			parentId = parent.getAttribute(prefix + DomUtils.langElementIdAttribute);
			newId = parentId + '-' + newId;
		}
		return newId + counter;
	},
	/**
	 * Wrap the currently selected node(s) into a specific block
	 * related to the given button.
	 * @param {TreeButton} button An istance of the button which was used to mark the block
	 * @return {HTMLElement[]} An array of the marked elements
	 */
	wrapBlock : function(button) {
		var editorController = this.getController('Editor'),
			// Get selection info from the editor
			selection = editorController.getSelectionObject('html', {
				start : DomUtils.blockRegex,
				end : DomUtils.blockRegex
			}, true),
			selectionRange = editorController.getSelectionRange();
			// Get the list of the nodes between the first and last selected
			// Notice: this excludes the last node if the selection has a strange end of range (e.g. 0)
			lastNode = (selectionRange[1] == 0) ? selection.end.previousSibling : selection.end, 
			selectedNodes = DomUtils.getSiblings(selection.start, lastNode),
			// Parse the wrapper element in order to determine where the content goes
			parsedHtml = Interpreters.parseElement(button.waweConfig.pattern.wrapperElement, {
				content : '<span class="' + DomUtils.tempSelectionClass + '"/>'
			}),
			// Create a new HTMLElement to be used as the wrapper (they all are divs)
			newElement = Ext.DomHelper.createDom({
				tag : 'div',
				html : parsedHtml
			}),
			// Get a reference to the temporary element to be replaced from the actual content (the wrapped elements)
			tempSelection = Ext.query('*[class*='+DomUtils.tempSelectionClass+']', newElement)[0];
		// Check for data integrity
		if (!selectedNodes || selectedNodes.length == 0)
			return [];
		// Insert the wrapper just before the first of the selected elements
		selectedNodes[0].parentNode.insertBefore(newElement, selectedNodes[0]);
		// Wrap the nodes
		if (tempSelection){ // temp selection could not exist if the element doesn't have a content
    		Ext.each(selectedNodes, function(node) {
    			tempSelection.parentNode.insertBefore(node, tempSelection);
    		});
    		// Delete the (temporary) utility node
    		tempSelection.parentNode.removeChild(tempSelection);
    		// Avoid useless nested elements
        }
		newElement = editorController.domReplace(newElement.childNodes[0], newElement);
		// Add breaking elements so that text can be inserted
		this.addBreakingElements(newElement);
		return [newElement];
	},

	/**
	 * Mark one or multiple inlines related to the button used to mark.
	 * 
	 * **Warning**: to provide a uniform interface, and void waste
	 * of code to check for differences, this method always returns an array of HTMLElement.
	 * Of course it's always possible to select a single element by using indices.
	 * @param {TreeButton} button An istance of the button which caused the marking
	 * @return {HTMLElement[]} An array of the marked elements
	 */
	wrapInline: function(button) {
		var editorController = this.getController('Editor'),
			// Creat temporary spans to be replaced
			toMarkNodes = editorController.applyPattern('tempselection', {
				inline : 'span',
				classes : DomUtils.tempSelectionClass
			}),
			markedElements = [],
			bogusNode,
			isMarker = false,
			//number of elements in the group
			numberOfEls, nodesLength = toMarkNodes.length;
		/* Temp nodes in toMarkNodes are separate span elements this loop 
		 * try to group these elements that are siblings but they can be separated by <br> element(s).
		 * Each group will be marked and not each element, in this way
		 * we can mark as unique inline, elements that are rendered with multiple rows.
		 * Each iteration represents a group for this reason the "i" variable is incremented by "numberOfEls". 
		 */
		for(var i = 0; i < nodesLength; i+=numberOfEls) {
			var node = toMarkNodes[i],
				extNode = new Ext.Element(node),
				//Get html of wrapperElement
				htmlContent = Interpreters.parseElement(button.waweConfig.pattern.wrapperElement, {
					content : ''
				}),
				inlineWrapper;
			bogusNode = extNode.up('[data-mce-bogus]');
			// An element without content e.g. eop element
			if ((button.waweConfig.pattern.wrapperElement.indexOf(Interpreters.flags.content)==-1)) {
			    isMarker = true;
			    if (bogusNode) {
                    inlineWrapper = Ext.DomHelper.insertHtml("afterEnd", bogusNode.dom, htmlContent);			         
			    } else {
			        inlineWrapper = Ext.DomHelper.insertHtml("afterEnd", toMarkNodes[nodesLength-1], htmlContent);
			    }
			} else {
                // Creation of group as dom element and put it before "node" that is the first element of this group
                inlineWrapper = Ext.DomHelper.insertHtml("beforeBegin", node, htmlContent);
			}
			var inlineExt = new Ext.Element(inlineWrapper),
			    next = extNode.next();
			//set the number of elements of this group to 1 this is the first element "node"
			numberOfEls = 1;
			//Add to the wrapper element the our temporal class
			inlineExt.addCls(DomUtils.tempSelectionClass);
			//Node temporal class is now useless
			node.removeAttribute("class");
			if (!isMarker) {
			    //Append the first child to the group 
                inlineExt.appendChild(node);
                //Finding other group elements that can exists only if the next sibling is a <br> 
                while (next && next.is("br")) {
                    var tmpBr = next;
                    var groupEl;
                    next = next.next();
                    //Check if the next sibling of <br> is the next element in the list of nodes to mark
                    if(next && next.dom==toMarkNodes[i+numberOfEls]){
                        groupEl = next.dom;
                        next = next.next();
                        numberOfEls++;
                    }
                    //append the <br> element to the group, we need to keep the original formatting
                    inlineExt.appendChild(tmpBr);
                    //if there is a group element clean and append it
                    if (groupEl) {
                        groupEl.removeAttribute("class");
                        inlineExt.appendChild(groupEl);
                    }
                }   
			}
			markedElements.push(inlineWrapper);
			if(isMarker) {
			    break;
			}
		}
		return markedElements;
	},
	/**
	 * This function retrieves the selected nodes set from the editor and mark
	 * them all according to the rule defined in the button's wrapperElement rule.
	 * Returns the list of the marked elements (useful in many cases).
	 * @param {TreeButton} button The button that was used to mark
	 * @param {Object} [attribute] The optional attribute (a name-value pair) to be set
	 * @return {Array} The array of the wrapped elements
	 */
	wrap : function(button, config) {
		var editorController = this.getController('Editor'), 
			buttonPattern = button.waweConfig.pattern, 
			isBlock = DomUtils.blockTagRegex.test(buttonPattern.wrapperElement), 
			newElements = [], 
			selectedNode = editorController.getSelectedNode(), 
			firstMarkedNode = DomUtils.getFirstMarkedAncestor(selectedNode);
			
		if (selectedNode === editorController.getBody().firstChild){
			return [];
		}
		
		if (!this.isAllowedElement(firstMarkedNode, button.waweConfig)) {
		    this.application.fireEvent(Statics.eventsNames.showNotification, {
		        content: new Ext.Template(Locale.strings.semanticError).apply({'name': "<b>"+button.waweConfig.name+"</b>"})
		    });
		    return;
		}
		
		// If the nodes have already been marked just exit
		if (firstMarkedNode && DomUtils.getButtonIdByElementId(firstMarkedNode.getAttribute(DomUtils.elementIdAttribute)) == button.id) {
			//Return a list contains the node
			return [firstMarkedNode];
		}
		if (isBlock) {
			newElements = this.wrapBlock(button);
		} else {
			newElements = this.wrapInline(button);
		}
		// Common finilizing operations
		Ext.each(newElements, function(newElement) {
			// Wrap the element inside an Ext.Element
			var extNode = new Ext.Element(newElement),
				oldElement = newElement.cloneNode(true),
				// Get a unique id for the marked element
				markingId = this.getMarkingId(button.id), 
				idPrefix = button.waweConfig.rules[Utilities.buttonFieldDefault].attributePrefix || '', 
				styleClass = buttonPattern.wrapperClass;
			// Set the internal id
			newElement.setAttribute(DomUtils.elementIdAttribute, markingId);
			
			/*This part has been moved on translating
			// Set the language specific id (with the given prefix)
			var langId = this.getLanguageMarkingId(newElement, button.id, idPrefix);
			newElement.setAttribute(idPrefix + DomUtils.langElementIdAttribute, langId);*/
			// Set the class
			newElement.setAttribute('class', buttonPattern.wrapperClass);
			// Set the optional attribute
			if (config.attribute && config.attribute.name && config.attribute.value) {// check if attribute has name and value
				newElement.setAttribute(idPrefix + config.attribute.name, config.attribute.value);
			}
			// Add the style
			editorController.applyAllStyles('*[class="' + styleClass + '"]', buttonPattern.wrapperStyle, button.waweConfig.shortLabel);
			//var explorer = this.getController("Explorer");
			// Set the document properties
			DocProperties.setMarkedElementProperties(markingId, {
				button : button,
				htmlElement : newElement
			});
			// Avoid random cursor repositioning by using a bookmark
			//var bm = editorController.getBookmark(); // BUG SAFARI (leave commented): The span used to set the bookmark is converted to an empty p and placed as the first child of the body
			// Apply the wrapping rules
			//Interpreters.wrappingRulesHandler(button, newElement);
			//editorController.restoreBookmark(bm)
		}, this);
		// Warn of the changed nodes
		
		this.application.fireEvent('nodeChangedExternally', newElements, {
			select : false,
			scroll : false,
			click : (config.silent)? false : true,
			change : true,
			silent: config.silent
		});
	},

	/**
	 * Simply remove a node attaching the children to the parent node
	 * @param {HTMLElement} markedNode The element to unmark
	 * @param {boolean} [unmarkChildren]
	 * @private
	 */	
	unmarkNode : function(markedNode, unmarkChildren) {
		if (unmarkChildren) {
			var discendents = Ext.query("["+DomUtils.elementIdAttribute+"]", markedNode);
			// Find all the marked children and unmark them
			Ext.each(discendents, function(child){
				this.unmarkNode(child);
			}, this);
		}
		var markedParent = markedNode.parentNode,
			markedId = markedNode.getAttribute(DomUtils.elementIdAttribute),
			extNode = new Ext.Element(markedNode),
			nextSpaceP = extNode.next('.'+DomUtils.breakingElementClass),
			prevSpaceP = extNode.prev('.'+DomUtils.breakingElementClass);
		// Replace all the 
		while (markedNode.hasChildNodes()) {
			markedNode.parentNode.insertBefore(markedNode.firstChild, markedNode);				
		}
		if (nextSpaceP) {
			nextSpaceP.remove();
		}

		if (prevSpaceP) {
			var prevSibling = prevSpaceP.prev();
			//Remove the space p if the previous sibling is not marked
			if(!prevSibling || !prevSibling.getAttribute(DomUtils.elementIdAttribute)){
				prevSpaceP.remove();
			}
		}

		markedNode.parentNode.removeChild(markedNode);
		// Remove any reference to the removed node
		delete DocProperties.markedElements[markedId];
	},
	
	/**
	 * Handler for the unmark feature, uses unmarkNode to really unmark the node(s)
	 * @param {HTMLElement} node The node to start from
	 * @param {Boolean} unmarkChildren True if also the children has to be unmarked
	 * TODO: remove spans after unmark!
	 */
	unmark: function(node, unmarkChildren) {
		// If a marked node could not be found we just have to
		var selectedNodes = this.getController("Editor").getSelectionObject("html", null, true);
		var start = DomUtils.getFirstMarkedAncestor(selectedNodes.start),
			end = DomUtils.getFirstMarkedAncestor(selectedNodes.end),
			siblings = DomUtils.getSiblings(start, end),
			// Check what kind of operations we have to perform on the unmarked node
			eventConfig = {change : true, click : true},
			markedParent = (start)? start.parentNode : end.parentNode;
		// Check the siblings
		if (siblings){
			// If the node is not marked delete it from the array
			siblings = siblings.filter(function(node){
				if (node && (node.nodeType != DomUtils.nodeType.ELEMENT || !node.getAttribute(DomUtils.elementIdAttribute))){
					return false;
				} else {
					return true;
				}
			});
		} else {
			// If not siblings were found it means that only one node, or none at all, is marked
			start? siblings = [start] : siblings = [end];
		}
		// Now we actually unmark the nodes
		Ext.each(siblings, function(node){
			var markedId = node.getAttribute(DomUtils.elementIdAttribute);
			this.unmarkNode(node, unmarkChildren);
			if (unmarkChildren) {
				this.application.fireEvent('nodeRemoved', markedId);
			}
		}, this);
		// If nodes were removed just focus the just unmarked node
		if (unmarkChildren) {
			eventConfig.change = false;
		}
		this.application.fireEvent('nodeChangedExternally', markedParent, eventConfig);
	},
	/**
	 * This function mark nodes passed in config according to the rule defined
	 * in the button's wrapperElement rule.
	 * This function is used by parsers for fast marking.
	 * @param {TreeButton} button The button that was used to mark
	 * @param {Object} config 
	 */
	autoWrap : function(button, config){
		if(!config.nodes | !button)
			return;
		var editorController = this.getController('Editor'),
			buttonPattern = button.waweConfig.pattern,
			isBlock = DomUtils.blockTagRegex.test(buttonPattern.wrapperElement),
			idPrefix = button.waweConfig.rules[Utilities.buttonFieldDefault].attributePrefix || '',
			styleClass = buttonPattern.wrapperClass;
		Ext.each(config.nodes,function(newElement,index){
			var extNode = new Ext.Element(newElement),
				// Get a unique id for the marked element
				markingId = this.getMarkingId(button.id),
				attrName,attrValue,
				firstMarkedNode = DomUtils.getFirstMarkedAncestor(newElement);
			
			newElement.removeAttribute("class");
			if (firstMarkedNode && DomUtils.getButtonIdByElementId(firstMarkedNode.getAttribute(DomUtils.elementIdAttribute)) == button.id) {
				return;
			}
			newElement.setAttribute(DomUtils.elementIdAttribute, markingId);
			// Set the internal id	
			newElement.setAttribute('class', buttonPattern.wrapperClass);
			// Set the optional attribute
			if (config.attributes && (attrName = config.attributes[index].name) && (attrValue = config.attributes[index].value)) {// check if attribute has name and value
				newElement.setAttribute(idPrefix + attrName, attrValue);
			}
			// Add the style
			editorController.applyAllStyles('*[class="' + styleClass + '"]', buttonPattern.wrapperStyle, button.waweConfig.shortLabel);

			if(isBlock){
				this.addBreakingElements(newElement);
			}
			// Set the document properties
			DocProperties.setMarkedElementProperties(markingId, {
				button : button,
				htmlElement : newElement
			});	
		},this);
		if (!config.noEvent) {
		    this.application.fireEvent('nodeChangedExternally', config.nodes, {
                select : false,
                scroll : false,
                click : (config.silent)? false : true,
                change : true,
                silent: config.silent
            });
		}
	},
	
	/**
	 * This function adds breaking elements before and/or after the node so that text can be inserted
	 * @param {HTMLElement} node 
	 */
	addBreakingElements : function(node){
		var breakingElementString = "<p class=\""+DomUtils.breakingElementClass+"\"></p>";
		Ext.DomHelper.insertHtml('afterEnd',node, breakingElementString);
		// Add a breaking element also above the marked element but only if there isn't another breaking element
		if (!node.previousSibling || node.previousSibling.getAttribute("class") != DomUtils.breakingElementClass){
			Ext.DomHelper.insertHtml('beforeBegin',node, breakingElementString);
		}
	},
	
	isAllowedElement: function(parent, buttonConfig) {
	    var languageData = this.getStore("LanguagesPlugin").getData(),
	        documentRoot = this.getController("Editor").getBody(),
	        semanticRules = languageData.semanticRules,
	        elements, elementRules, parentId, parentConfig, parentRules, childrenRules;
	    if (languageData.semanticRules && languageData.semanticRules.elements) {
            elements = languageData.semanticRules.elements;
            elementRules = elements[buttonConfig.name];
            if (parent) {
                parentId = parent.getAttribute(DomUtils.elementIdAttribute);
                if (DocProperties.markedElements[parentId] && DocProperties.markedElements[parentId].button) {
                    parentConfig = DocProperties.markedElements[parentId].button.waweConfig;
                    parentRules = elements[parentConfig.name];
                    if (parentRules && parentRules.children) {
                        childrenRules = parentRules.children[buttonConfig.name];
                        if (childrenRules) {
                            if (childrenRules.cardinality > 0 && childrenRules.cardinality <= this.getNumberOfChildrenByClass(parent, buttonConfig.name)) {
                                return false;
                            }
                        } else {
                            return true; //TODO: improve this
                        }   
                    }
                }
                
            }
            if (elementRules) {
                if (elementRules.cardinality > 0 && elementRules.cardinality <= this.getNumberOfChildrenByClass(documentRoot, buttonConfig.name, true)) {
                    return false;
                }
            }            	        
	    }
	    
	    return true;
	},
	
	getNumberOfChildrenByClass: function(node, childClass, includeDescendant) {
	    var extNode = new Ext.Element(node),
	       childrenNumber = 0,
	       children = extNode.query("*[class~="+childClass+"]");
	    
	    return children.length;
	},
	
	searchObjInArrayByAttribute: function(array, attrName, attrValue) {
	    var aLength = array.length, i;
	    
	    for(i = 0; i < aLength; i++) {
	        if(array[i][attrName] == attrValue) {
	            return array[i];
	        }
	    }
	    
	    return null;
	},

	init : function() {
		// Listens for marking inputs
		this.application.on({
			markingMenuClicked : {fn: this.wrap, scope:this},
			markingRequest : {fn: this.autoWrap, scope:this}
		});
	}
});
