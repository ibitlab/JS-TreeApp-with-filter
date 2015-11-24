var appTree = {
    _tree: null,
    init: function () {
        this.cacheDOM();

        this.initTree();
        this.initTreeView();

        this.bindEvents();
    },
    cacheDOM: function () {
        this.$treeContainer = $('div.tree');
        this.$filter = $('input.tree-filter');
        this.$treeSerializeBtn = $('.tree-serialize-btn');
        this.$treeSerializeResult = $('.tree-serialize-result');
        this.$treeSerializePretty = $('.tree-serialize-pretty');
    },
    initTree: function () {
        this._tree = new Tree(this.getTreeNodeObjLiteral());
    },
    initTreeView: function () {
        this._treeView = new TreeView(this.$treeContainer[0], this._tree.tree);
        this._treeView.render();
    },
    bindEvents: function () {
        this.$treeSerializeBtn.on('click', this.serializeTree.bind(this));
        this.$filter.on('keyup', this.inputFilterKeyUp.bind(this));
    },
    inputFilterKeyUp: function () {
        Helper.waitForFinalEvent(this.filterTree.bind(this), 200, "treeFilterKeyUpID");
    },
    filterTree: function () {
        var filterText = this.$filter.val();
        this._treeView.filter(filterText);
    },
    serializeTree: function () {
        var spacer = (this.$treeSerializePretty.is(':checked')) ? "  " : "";
        this.$treeSerializeResult.val(this._tree.serialize(spacer));
    },
    getTreeNodeObjLiteral: function () {
        return {
            id: 1,
            name: "id 1: Lime",
            sub: [{
                id: 2,
                name: "id 2: Golden"
            }, {
                id: 3,
                name: "id 3: Cyan",
                sub: [{
                    id: 4,
                    name: "id 4: Pink",
                    sub: [{
                        id: 8,
                        name: "id 8: Magenta"
                    }]
                }]
            }, {
                id: 5,
                name: "id 5: Green",
                sub: [{
                    id: 6,
                    name: "id 6: Orange"
                }, {
                    id: 7,
                    name: "id 7: Purple"
                }]
            }]
        };
    },
};

var Helper = {
    /**
     * Wait for final event.
     * @param {function} callback.
     * @param {int} ms - delay to call callback.
     * @param {string} uniqueId.
     */
    waitForFinalEvent: (function () {
        var timers = {};
        return function (callback, ms, uniqueId) {
            if (!uniqueId) {
                uniqueId = "Don't call this twice without a uniqueId";
            }
            if (timers[uniqueId]) {
                clearTimeout(timers[uniqueId]);
            }
            timers[uniqueId] = setTimeout(callback, ms);
        };
    })()
};

/**
 * Tree constructor.
 * @param {object} nodes.
 */
function Tree(nodes) {
    //this.tree = (typeof(nodes) === 'undefined') ? new TreeNode(0, "root") : nodes;
    this.tree = (typeof (nodes) === 'undefined') ? {
        "id": 0,
        "name": "root",
        "sub": []
    } : nodes;
};

Tree.prototype.serialize = function (spacer) {
    var sp = (typeof (spacer) === 'undefined') ? "" : spacer;
    if (this.tree) {
        return JSON.stringify(this.tree, ['id', 'sub'], sp);
    }
};

/**
 * TreeView constructor.
 * @param {DOM element} container.
 * @param {object Tree} tree.
 * @param {DOM element} mainTemplateEl.
 * @param {DOM element} listTemplateEl.
 * move to JQuery Plugin in future
 */
function TreeView(container, tree, mainTemplateEl, listTemplateEl) {
    this.$container = (typeof (container) === 'undefined') ? $(document.body) : $(container);
    this.tree = (typeof (tree) === 'undefined') ? null : tree;
    this.$mainTemplateEl = (typeof (mainTemplateEl) === 'undefined') ? $("#treemain") : $(mainTemplateEl);
    this.$listTemplateEl = (typeof (listTemplateEl) === 'undefined') ? $("#treelist") : $(listTemplateEl);

    // The main template.
    this.treeMain = Handlebars.compile(this.$mainTemplateEl.html());

    // Register the treelist partial that "treemain" uses.
    Handlebars.registerPartial("treelist", this.$listTemplateEl.html());
}

TreeView.prototype.render = function () {
    // Render the tree.
    // wrap with array, as we have always one root node
    var s = [];
    s.push(this.tree);
    this.$container.append(this.treeMain({
        sub: s
    }));
};

TreeView.prototype.filter = function (filter) {
    this.filterTextOrig = (typeof (filter) === 'undefined') ? "" : filter;
    this.filterText = this.filterTextOrig.toLowerCase();
    var that = this;

    // use data-id attribute for linkink with Tree Object
    var checkFilterInSub = function (treeNode, setChildToTrue) {
        //Check current Node Filter
        var textExistInCurrent = true;
        if (treeNode.name.toLowerCase().indexOf(that.filterText) === -1) {
            textExistInCurrent = false;
        }
        else {
            textExistInCurrent = true;
        }

        //Check Childs
        var textExistInSubs = false;

        if (_.has(treeNode, "sub")) {
            _.each(treeNode.sub, function (subNode) {
                //if Child Nodes not have Text
                var textExistInSubOne = checkFilterInSub(subNode, setChildToTrue || textExistInCurrent);
                if (textExistInSubOne) {
                    textExistInSubs = true;
                }
            });
        }

        if (setChildToTrue === true ||
            textExistInCurrent === true ||
            textExistInSubs === true) {

            that.nodeShow(treeNode, textExistInCurrent);
            return true;
        }
        else {
            that.nodeHide(treeNode);
            return false;
        }
    };

    //use DocumentFragment
    this.changingBegin();

    //show all tree as filter Empty
    var isAnyTreeNodesToShow = checkFilterInSub(this.tree, (this.filterText == "") ? true : false);

    //end use DocumentFragment
    this.changingEnd();

    if (isAnyTreeNodesToShow) {
        $(".tree-filter").parent().removeClass("has-error").addClass("has-success");
    }
    else {
        $(".tree-filter").parent().removeClass("has-success").addClass("has-error");
    }
};

TreeView.prototype.changingBegin = function () {
    this.$containerFragment = $(document.createDocumentFragment());
    this.$container.find(">ul").appendTo(this.$containerFragment);
}

TreeView.prototype.changingEnd = function () {
    this.$containerFragment.appendTo(this.$container);
}

TreeView.prototype.nodeShow = function (node, highlight) {
    var highl = (highlight && highlight === true) ? true : false;
    var $node = this.$containerFragment.find("[data-id='" + node.id + "']");
    if ($node.length) {
        if (highl) {

            var searchText = this.filterTextOrig;
            var searchTextRegExp = new RegExp(searchText, "ig"); //  case insensitive regexp
            var text = node.name;

            var textRes = text.replace(searchTextRegExp, '<span class="filter-highlight">$&</span>');

            $node.find(">.tree-item-name").html(textRes);
        }
        else {
            $node.find(">.tree-item-name").html(node.name);
        }
        $node.show();
    }
};

TreeView.prototype.nodeHide = function (node) {
    var $node = this.$containerFragment.find("[data-id='" + node.id + "']");
    if ($node.length) {
        $node.hide();
    }
};

$(document).ready(function () {
    appTree.init();
});

// TreeNode constructor
/*
function TreeNode(id, name, subNodesArray) {
    this.id = (typeof(id) === 'undefined') ? 0 : parseInt(id, 10);
    this.name = (typeof(name) === 'undefined') ? '' : name;
    this.sub = (typeof(subNodesArray) === 'undefined' || !_.isArray(subNodesArray)) ? [] : subNodesArray;
};

TreeNode.prototype.addSub = function(subNode) {
    this.sub.push(subNode);
    return subNode;
};
*/