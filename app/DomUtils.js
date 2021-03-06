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
 * Generic dom utilities 
 */
Ext.define('LIME.DomUtils', {
	/* Since this is merely a utility class define it as a singleton (static members by default) */
	singleton : true,
	alternateClassName : 'DomUtils',
	/**
	 * @property {String} markedElements
	 * Temporary parsing element class for text fragments. 
	 */
	tempParsingClass : "tempParsing",
	/**
	 * @property {String} toRemoveClass
	 * Class given to the elements that have to be removed before the translation 
	 */
	toRemoveClass : "useless",
	/**
	 * @property {String} breakingElementClass
	 * Class given to those elements that work as "breaker" for the text 
	 */
	breakingElementClass : "breaking",
	/**
	 * @property {String} tempSelectionClass 
	 * Temporary selection element class for text fragments.
	 */
	tempSelectionClass : "tempSelection",
	/**
	 * @property {String} elementIdAttribute
	 * This is the name of the attribute that is used as internal id 
	 */
	elementIdAttribute : "internalId",
	/**
	 * @property {String} langElementIdAttribute
	 * This is the name of the identificator attribute 
	 */
	langElementIdAttribute : "id",
	/**
	 * @property {String} elementIdSeparator
	 * Separator string used in the element id attribute 
	 */
	elementIdSeparator : '_',
	/**
	 * @property {RegExp} blockTagRegex
	 * RegExp object used for recognise if a string is a block element 
	 */
	blockTagRegex : /<(address|blockquote|body|center|dir|div|dlfieldset|form|h[1-6]|hr|isindex|menu|noframes|noscript|ol|pre|p|table|ul|dd|dt|frameset|li|tbody|td|tfoot|th|thead|tr|html)(\/)?>/i,
	/**
	 * @property {RegExp} blockRegex
	 * RegExp object used for recognise if tag is a block element 
	 */
	blockRegex : /^(address|blockquote|body|center|dir|div|dlfieldset|form|h[1-6]|hr|isindex|menu|noframes|noscript|ol|pre|p|table|ul|dd|dt|frameset|li|tbody|td|tfoot|th|thead|tr|html)$/i,
	/**
	 * @property {RegExp} vowelsRegex
	 * RegExp object used for vowels
	 */
	vowelsRegex : /([a, e, i, o, u]|[0-9]+)/gi,
	
	
	/**
	 * @property {Object} nodeType
	 * This object is a traslation of numeric node type in string type 
	 */
	nodeType : {
		ELEMENT : 1,
		ATTRIBUTE : 2,
		TEXT : 3,
		CDATA_SECTION : 4,
		ENTITY_REFERENCE : 5,
		ENTITY : 6,
		PROCESSING_INSTRUCTION : 7,
		COMMENT : 8,
		DOCUMENT : 9,
		DOCUMENT_TYPE : 10,
		DOCUMENT_FRAGMENT : 11,
		NOTATION : 12
	},
	
	/**
	 * This function take a @first node and a @last node
	 * and append all their siblings (first and last included)
	 * to the given @newParent
	 * @first and @last MUST BE at the same nesting level of the
	 * same element! No checking is performed by this function!
	 * @param {HTMLElement} first
	 * @param {HTMLElement} last
	 * @param {HTMLElement} newParent
	 */
	appendChildren : function(first, last, newParent) {
		var temp = first;
		/* iterator */
		last = last.nextSibling;
		var next;
		/* next node to visit */
		do {
			next = temp.nextSibling;
			newParent.appendChild(temp)
			temp = next;
		} while (temp != last);
	},

	/**
	 * Return an ExtJS DomQuery compatible query that 
	 * will return all the useless elements that can be removed
	 * before translating
	 * @returns {String} The query
	 */
	getTempClassesQuery : function(){
		// TODO rendere le classi iterabili
		return "."+this.tempSelectionClass+", ."+this.toRemoveClass+", ."+this.tempSelectionClass+", ."+this.breakingElementClass;
	},
	
	/**
	 * This function returns a list of the siblings of the given name (e.g. p, div etc.)
	 * of the startElement (if endElement is specified it stops once that is reached;
	 * if the endElement is never found, e.g. out of the hierarchy, the computation
	 * stops at the last sibling found).
	 * WARNING: this function does NOT provide any check about the order of the nodes given,
	 * it could not terminate if endElement is before/in/above startElement 
	 * @param {HTMLElement} startElement
	 * @param {HTMLElement} [endElement]
	 * @param {String/Regexp} [nodeName]
	 * @returns {HTMLElement[]}
	 */
	getSiblings : function(startElement, endElement, nodeName) {
		if (!startElement || !endElement)
			return null;
		var iterator = startElement;
		var siblings = [];
		// Include start and end
		while (iterator != endElement.nextSibling) {
			// Use the regex if available
			var condition = (Utilities.toType(nodeName) == "regexp") ? nodeName.test(iterator.nodeName) : iterator.nodeName.toLowerCase() == nodeName;
			if (!nodeName || condition) {
				siblings.push(iterator);
			}
			iterator = iterator.nextSibling;
		}
		return siblings;
	},

	/**
	 * TODO: test this function
	 *
	 * This function is a innerHTML replacement.
	 * It allows to completely move all the children nodes from
	 * a source to a destination.
	 * @param {HTMLElement} from The source
	 * @param {HTMLElement} to The destination
	 */
	moveChildrenNodes : function(from, to) {
		while (to.firstChild) {
            to.removeChild(to.firstChild);
        }
        while (from.firstChild) {
            to.appendChild(from.firstChild);
        }
	},

	/**
	 * This function returns an HtmlElement of the given type
	 * starting from the given root and going towards the given direction
	 * NOTE/TODO: down direction not implemented yet!
	 * @param {HTMLElement} root
	 * @param {String/Regexp} name
	 * @returns {HTMLElement}
	 */
	getNodeByName : function(root, name) {
		// Once we reached the body element we stop
		var selectedNode = root;
		while (selectedNode.nodeName.toLowerCase() != 'body') {
			var nodeName = selectedNode.nodeName.toLowerCase();
			// name can be either be a string or a regexp object (useful in most cases, e.g. for sensitive case or multiple names)
			if ((Utilities.toType(name) == "regexp") ? name.test(nodeName) : (nodeName == name.toLowerCase())) {
				return selectedNode;
			}
			selectedNode = selectedNode.parentNode;
		}
		return null;
	},
	/**
	 * Function which checks if a node @child is a descendant of @parent
	 * @param {HTMLElement} parent
	 * @param {HTMLElement} child
	 * @returns {Boolean}
	 */
	isDescendant : function(parent, child) {
		var node = child.parentNode;
		while (node != null) {
			if (node == parent) {
				return true;
			}
			node = node.parentNode;
		}
		return false;
	},

	/**
	 * Function which returns the level of nesting (from the root with level 1) of the given @node
	 * @param {HTMLElement} node
	 * @returns {Number}
	 */
	nestingLevel : function(node) {
		var lv = 1;
		while (node != null) {
			node = node.parentNode;
			lv++;
		}
		return lv;
	},

	/**
	 * This function converts a XML node into a JSON string
	 * @param {HTMLElement} xml
	 * @returns {Object}
	 */
	xmlToJson : function(xml) {
		// Create the return object
		var obj;
		if (xml && xml.nodeType == DomUtils.nodeType.ELEMENT) {// element*/
			obj = {};
			obj.el = xml;
			// do children
			if (xml && xml.hasChildNodes()) {
				obj.children = [];
				for (var i = 0; i < xml.childNodes.length; i++) {
					var item = xml.childNodes.item(i);
					if (item) {
						var nodeName = item.nodeName.toLowerCase();
						var childObj = this.xmlToJson(item);
						if (childObj)
							obj.children.push(childObj);
					}
				}
			}
		}
		return obj;
	},
	/**
	 * This function search extra information in a node that has a specific type and return it
	 * @param {HTMLElement} node
	 * @param {HTMLElement} type
	 * @param {HTMLElement} [limit]
	 * @returns {String}
	 */
	getNodeExtraInfo : function(node, type, limit) {
		var info = '';
		if(node && node.getAttribute("class") && node.getAttribute("class").indexOf(type)!=-1){
			var infoLength = limit || Statics.extraInfoLimit;
			var wrapper = new Ext.Element(node);
			//TODO: da file config
			var where = ["num", "heading", "subheading"];
			var infoNode;
			for (var i = 0; i < where.length; i++) {
				var contentEl = wrapper.child(".content");
				if(contentEl){
					wrapper = contentEl;
				}
				var chNode = wrapper.down("." + where[i]);
				if (chNode) {
					var hcontainer = chNode.parent(".hcontainer");
					if(hcontainer && hcontainer.dom==node){
						infoNode = chNode;
						break;
					}
				}
			}
			if (infoNode) {
				info = infoNode.getHTML();
				info = info.replace(/<(?:.|\n)*?>/gm, '');
			}
			if (info.length > infoLength) {
				info = info.substr(0, infoLength) + "...";
			}
		}
		return info;
	},
	/**
	 * This function retrieves the first marked ascendant
	 * for the given node.
	 * @param {HTMLElement} node
	 * @returns {HTMLElement} a reference to the marked ascendant node, false if nothing was found
	 */
	getFirstMarkedAncestor : function(node) {
		if (!node)
			return null;
		if (node && node.nodeType == DomUtils.nodeType.ELEMENT && node.getAttribute(DomUtils.elementIdAttribute) != null)
			return node;
		node = (node.parentNode) ? node.parentNode : null;
		// let's start from the parent, shall we?
		while (node && node.nodeType == DomUtils.nodeType.ELEMENT) {
			if (node.getAttribute(DomUtils.elementIdAttribute)) {
				return node;
			}
			node = node.parentNode;
		}
		return null;
	},

	/**
	 * This function returns a list of all the marked children's ids
	 * found starting from node. 
	 *
	 * @param {HTMLElement} node
	 * @returns {String[]}
	 */
	getMarkedChildrenId : function(node) {
		var childrenIds = [];
		Ext.each(Ext.query('[' + DomUtils.elementIdAttribute + ']', node), function(child) {
			var id = child.getAttribute(DomUtils.elementIdAttribute);
			childrenIds.push(id);
		});
		return childrenIds;
	},

	/**
	 * This function returns a reference to an existing button
	 * which matches part of the given elementId.
	 * @param {String} elementId
	 * @returns {String} 
	 */
	getButtonIdByElementId : function(elementId) {
		if (!elementId) return null;
		return elementId.split(DomUtils.elementIdSeparator)[0];
	},
	
	/**
	 * This function returns the marking button related to the passed element
	 * @param {HTMLElement} element
	 * returns {LIME.view.markingmenu.TreeButton}
	 */
    getButtonByElement : function(element) {
        var elementId, markingElement;
        if (element && element.getAttribute) {
            elementId = element.getAttribute(DomUtils.elementIdAttribute);
            markingElement = DocProperties.getMarkedElement(elementId);
            if (elementId && markingElement) {
                return markingElement.button;	
            }
        }
        return null;
    },
	
	/**
	 * This function builds and set an id attribute starting from the given element.
	 * The build process is based on the hierarchy of the elements.
	 * The difference between this and {@link LIME.controller.Marker#getMarkingId} is that this id is
	 * specific to the language plugin currently in use while the latest is for development purposes.
	 * @param {HTMLElement} markedElement The element we have to set the attribute to
	 * @param {Object} counters Counters of elements
	 */
	setLanguageMarkingId : function(markedElement, counters) {
		var newId = '',
			elementId = markedElement.getAttribute(this.elementIdAttribute);		
		if(elementId && DocProperties.markedElements[elementId]){
			var counter = 1,
				button = DocProperties.markedElements[elementId].button,
				prefix = button.waweConfig.rules[Utilities.buttonFieldDefault].attributePrefix || '';
			// If the element has already an language id, leave it
		    if (markedElement.getAttribute(prefix + this.langElementIdAttribute))
		      return;
			newId = button.id.replace(this.vowelsRegex, ''),
			//don't use "parent" variable because in IE is a reference to Window
			parentMarked = this.getFirstMarkedAncestor(markedElement.parentNode);
			if (parentMarked) {
				parentId = parentMarked.getAttribute(prefix + this.langElementIdAttribute);
				if(!counters[parentId]){
					counters[parentId] = {};
				}else if(counters[parentId][newId]){
					counter = counters[parentId][newId];
				}
				counters[parentId][newId] = counter+1;
				newId = parentId + '-' + newId;
			}else{
				if(!counters[newId]){
					counters[newId] = counter+1; 
				}else{
					counter = counters[newId];
				}
			}
			newId+= counter;
		}
		if(newId != '')
			markedElement.setAttribute(prefix + this.langElementIdAttribute, newId);
	},
	/** This function search the Node that contains the passed string
 	 * @param {String} text
 	 * @param {HTMLElement} initNode
 	 * @param {HTMLElement[]} [rejectElements] Elements to reject
 	 * @returns {HTMLElement}
	 */
	findNodeByText : function(text, initNode,rejectElements) {
		containsText=function(node){
			if(rejectElements && Ext.Array.indexOf(rejectElements,node)!=-1){
				return NodeFilter.FILTER_REJECT
			}else if (node.innerHTML.indexOf(text)!=-1)
				return NodeFilter.FILTER_ACCEPT
			else
				return NodeFilter.FILTER_SKIP
		}	
        var w = initNode.ownerDocument.createTreeWalker(initNode, NodeFilter.SHOW_ELEMENT, containsText, false);
    	var node;
        while (w.nextNode()) {
			node = w.currentNode;
        }
        return node
   },
   /** This function search the Text Nodes that contains the passed string
 	 * @param {String} text
 	 * @param {HTMLElement} initNode
 	 * @returns {HTMLElement[]} Array of text nodes
	 */
   findTextNodes : function(text, initNode) {
		containsText=function(node){
			if (node.textContent.indexOf(text)!=-1)
				return NodeFilter.FILTER_ACCEPT
			else
				return NodeFilter.FILTER_SKIP
		};
        var w = initNode.ownerDocument.createTreeWalker(initNode, NodeFilter.SHOW_TEXT, containsText, false);
    	var nodes = [];
    	try {
            while (w.nextNode()) {
			 nodes.push(w.currentNode);
            }
        } catch(e) {
            Ext.log({level: "error"}, e);
        };
        return nodes;
   },
   /** This function search all occurences of subStr in str, and returns all accurences position
 	 * @param {String} str
 	 * @param {String} subStr
 	 * @returns {Number[]} Array of indexes
	 */
   stringIndexesOf : function(str, subStr){
   		str+='';
   		subStr+='';
   		var pos = 0,
   			indexes = [],
   			sLength = subStr.length;
   		
   		while(pos!=-1){
   			pos = str.indexOf(subStr,pos);
   			if(pos!=-1){
   				indexes.push(pos);
   				pos+=sLength;
   			}
   		}
   		return indexes;
   },
   
   /**
     * Add the given style properties to the elements that match
     * the given css selector.
     * @param {String} selector The css selector
     * @param {String} styleText The string representing the property
     * @param {String} doc Document to apply the style
     */
    addStyle : function(selector, styleText, doc) {
        // Create a style element and append it into the head element
        var head = Ext.query('head', doc)[0],
            styleEl = Ext.query('style', head)[0];
        if (!styleEl) {
            styleEl = doc.createElement('style');
            head.appendChild(styleEl);
        }
        // Append all the style properties to the style element just created
        if (styleEl.innerHTML.indexOf(selector + " {") == -1) {
            var styleTxt = selector + " {" + styleText + "}";
            var cssText = doc.createTextNode(styleTxt);
            styleEl.appendChild(cssText);
        }
    },
    /**
     * Wrapper for DOMParser.parseFromString 
     */
    parseFromString: function(string) {
        var parser = new DOMParser(), docDom;
        // IE exception
        try {
            docDom = parser.parseFromString(string, "application/xml");
            if (docDom.documentElement.tagName == "parsererror" || 
                        docDom.documentElement.querySelector("parseerror") || 
                        docDom.documentElement.querySelector("parsererror")) {
                docDom = false;
            }
        } catch(e) {
            docDom = false;
        }
        return docDom;
    },
    
    /**
     * Wrapper for XMLSerializer.serializeToString 
     */
    serializeToString: function(dom) {
        var XMLS = new XMLSerializer();
        return XMLS.serializeToString(dom);    
    },
    
    getDocTypeByNode: function(node) {
        var cls = node.getAttribute("class").split(' ');
        return Ext.Array.difference(cls, [DocProperties.documentBaseClass])[0];
    }
    
});
