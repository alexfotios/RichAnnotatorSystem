(function() {
  var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  define(["ide/file-tree/directives/fileEntity", "ide/file-tree/directives/draggable", "ide/file-tree/directives/droppable", "ide/file-tree/controllers/FileTreeController", "ide/file-tree/controllers/FileTreeEntityController", "ide/file-tree/controllers/FileTreeFolderController", "ide/file-tree/controllers/FileTreeRootFolderController"], function() {
    var FileTreeManager;
    return FileTreeManager = (function() {
      function FileTreeManager(ide, $scope) {
        this.ide = ide;
        this.$scope = $scope;
        this.$scope.$on("project:joined", (function(_this) {
          return function() {
            _this.loadRootFolder();
            _this.loadDeletedDocs();
            return _this.$scope.$emit("file-tree:initialized");
          };
        })(this));
        this.$scope.$watch("rootFolder", (function(_this) {
          return function(rootFolder) {
            if (rootFolder != null) {
              return _this.recalculateDocList();
            }
          };
        })(this));
        this._bindToSocketEvents();
        this.$scope.multiSelectedCount = 0;
        $(document).on("click", (function(_this) {
          return function() {
            _this.clearMultiSelectedEntities();
            return _this.$scope.$digest();
          };
        })(this));
      }

      FileTreeManager.prototype._bindToSocketEvents = function() {
        this.ide.socket.on("reciveNewDoc", (function(_this) {
          return function(parent_folder_id, doc) {
            var parent_folder;
            parent_folder = _this.findEntityById(parent_folder_id) || _this.$scope.rootFolder;
            return _this.$scope.$apply(function() {
              parent_folder.children.push({
                name: doc.name,
                id: doc._id,
                type: "doc"
              });
              return _this.recalculateDocList();
            });
          };
        })(this));
        this.ide.socket.on("reciveNewFile", (function(_this) {
          return function(parent_folder_id, file, source, linkedFileData) {
            var parent_folder;
            parent_folder = _this.findEntityById(parent_folder_id) || _this.$scope.rootFolder;
            return _this.$scope.$apply(function() {
              parent_folder.children.push({
                name: file.name,
                id: file._id,
                type: "file",
                linkedFileData: linkedFileData
              });
              return _this.recalculateDocList();
            });
          };
        })(this));
        this.ide.socket.on("reciveNewFolder", (function(_this) {
          return function(parent_folder_id, folder) {
            var parent_folder;
            parent_folder = _this.findEntityById(parent_folder_id) || _this.$scope.rootFolder;
            return _this.$scope.$apply(function() {
              parent_folder.children.push({
                name: folder.name,
                id: folder._id,
                type: "folder",
                children: []
              });
              return _this.recalculateDocList();
            });
          };
        })(this));
        this.ide.socket.on("reciveEntityRename", (function(_this) {
          return function(entity_id, name) {
            var entity;
            entity = _this.findEntityById(entity_id);
            if (entity == null) {
              return;
            }
            return _this.$scope.$apply(function() {
              entity.name = name;
              return _this.recalculateDocList();
            });
          };
        })(this));
        this.ide.socket.on("removeEntity", (function(_this) {
          return function(entity_id) {
            var entity;
            entity = _this.findEntityById(entity_id);
            if (entity == null) {
              return;
            }
            _this.$scope.$apply(function() {
              _this._deleteEntityFromScope(entity);
              return _this.recalculateDocList();
            });
            return _this.$scope.$broadcast("entity:deleted", entity);
          };
        })(this));
        return this.ide.socket.on("reciveEntityMove", (function(_this) {
          return function(entity_id, folder_id) {
            var entity, folder;
            entity = _this.findEntityById(entity_id);
            folder = _this.findEntityById(folder_id);
            return _this.$scope.$apply(function() {
              _this._moveEntityInScope(entity, folder);
              return _this.recalculateDocList();
            });
          };
        })(this));
      };

      FileTreeManager.prototype.selectEntity = function(entity) {
        this.selected_entity_id = entity.id;
        this.ide.fileTreeManager.forEachEntity(function(entity) {
          return entity.selected = false;
        });
        return entity.selected = true;
      };

      FileTreeManager.prototype.toggleMultiSelectEntity = function(entity) {
        entity.multiSelected = !entity.multiSelected;
        return this.$scope.multiSelectedCount = this.multiSelectedCount();
      };

      FileTreeManager.prototype.multiSelectedCount = function() {
        var count;
        count = 0;
        this.forEachEntity(function(entity) {
          if (entity.multiSelected) {
            return count++;
          }
        });
        return count;
      };

      FileTreeManager.prototype.getMultiSelectedEntities = function() {
        var entities;
        entities = [];
        this.forEachEntity(function(e) {
          if (e.multiSelected) {
            return entities.push(e);
          }
        });
        return entities;
      };

      FileTreeManager.prototype.getMultiSelectedEntityChildNodes = function() {
        var child_entities, entities, entity, i, parts, path, paths, prefixes, _i, _j, _len, _ref;
        entities = this.getMultiSelectedEntities();
        paths = {};
        for (_i = 0, _len = entities.length; _i < _len; _i++) {
          entity = entities[_i];
          paths[this.getEntityPath(entity)] = entity;
        }
        prefixes = {};
        for (path in paths) {
          entity = paths[path];
          parts = path.split("/");
          if (parts.length <= 1) {
            continue;
          } else {
            for (i = _j = 1, _ref = parts.length - 1; 1 <= _ref ? _j <= _ref : _j >= _ref; i = 1 <= _ref ? ++_j : --_j) {
              prefixes[parts.slice(0, i).join("/")] = true;
            }
          }
        }
        child_entities = [];
        for (path in paths) {
          entity = paths[path];
          if (prefixes[path] == null) {
            child_entities.push(entity);
          }
        }
        return child_entities;
      };

      FileTreeManager.prototype.clearMultiSelectedEntities = function() {
        if (this.$scope.multiSelectedCount === 0) {
          return;
        }
        this.forEachEntity(function(entity) {
          return entity.multiSelected = false;
        });
        return this.$scope.multiSelectedCount = 0;
      };

      FileTreeManager.prototype.multiSelectSelectedEntity = function() {
        var _ref;
        return (_ref = this.findSelectedEntity()) != null ? _ref.multiSelected = true : void 0;
      };

      FileTreeManager.prototype.existsInFolder = function(folder_id, name) {
        var entity, folder;
        folder = this.findEntityById(folder_id);
        if (folder == null) {
          return false;
        }
        entity = this._findEntityByPathInFolder(folder, name);
        return entity != null;
      };

      FileTreeManager.prototype.findSelectedEntity = function() {
        var selected;
        selected = null;
        this.forEachEntity(function(entity) {
          if (entity.selected) {
            return selected = entity;
          }
        });
        return selected;
      };

      FileTreeManager.prototype.findEntityById = function(id, options) {
        var entity, _i, _len, _ref;
        if (options == null) {
          options = {};
        }
        if (this.$scope.rootFolder.id === id) {
          return this.$scope.rootFolder;
        }
        entity = this._findEntityByIdInFolder(this.$scope.rootFolder, id);
        if (entity != null) {
          return entity;
        }
        if (options.includeDeleted) {
          _ref = this.$scope.deletedDocs;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            entity = _ref[_i];
            if (entity.id === id) {
              return entity;
            }
          }
        }
        return null;
      };

      FileTreeManager.prototype._findEntityByIdInFolder = function(folder, id) {
        var entity, result, _i, _len, _ref;
        _ref = folder.children || [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          entity = _ref[_i];
          if (entity.id === id) {
            return entity;
          } else if (entity.children != null) {
            result = this._findEntityByIdInFolder(entity, id);
            if (result != null) {
              return result;
            }
          }
        }
        return null;
      };

      FileTreeManager.prototype.findEntityByPath = function(path) {
        return this._findEntityByPathInFolder(this.$scope.rootFolder, path);
      };

      FileTreeManager.prototype._findEntityByPathInFolder = function(folder, path) {
        var entity, name, parts, rest, _i, _len, _ref;
        if ((path == null) || (folder == null)) {
          return null;
        }
        if (path === "") {
          return folder;
        }
        parts = path.split("/");
        name = parts.shift();
        rest = parts.join("/");
        if (name === ".") {
          return this._findEntityByPathInFolder(folder, rest);
        }
        _ref = folder.children;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          entity = _ref[_i];
          if (entity.name === name) {
            if (rest === "") {
              return entity;
            } else if (entity.type === "folder") {
              return this._findEntityByPathInFolder(entity, rest);
            }
          }
        }
        return null;
      };

      FileTreeManager.prototype.forEachEntity = function(callback) {
        var entity, _i, _len, _ref, _results;
        if (callback == null) {
          callback = function(entity, parent_folder, path) {};
        }
        this._forEachEntityInFolder(this.$scope.rootFolder, null, callback);
        _ref = this.$scope.deletedDocs || [];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          entity = _ref[_i];
          _results.push(callback(entity));
        }
        return _results;
      };

      FileTreeManager.prototype._forEachEntityInFolder = function(folder, path, callback) {
        var childPath, entity, _i, _len, _ref, _results;
        _ref = folder.children || [];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          entity = _ref[_i];
          if (path != null) {
            childPath = path + "/" + entity.name;
          } else {
            childPath = entity.name;
          }
          callback(entity, folder, childPath);
          if (entity.children != null) {
            _results.push(this._forEachEntityInFolder(entity, childPath, callback));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      };

      FileTreeManager.prototype.getEntityPath = function(entity) {
        return this._getEntityPathInFolder(this.$scope.rootFolder, entity);
      };

      FileTreeManager.prototype._getEntityPathInFolder = function(folder, entity) {
        var child, path, _i, _len, _ref;
        _ref = folder.children || [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          child = _ref[_i];
          if (child === entity) {
            return entity.name;
          } else if (child.type === "folder") {
            path = this._getEntityPathInFolder(child, entity);
            if (path != null) {
              return child.name + "/" + path;
            }
          }
        }
        return null;
      };

      FileTreeManager.prototype.getRootDocDirname = function() {
        var rootDoc;
        rootDoc = this.findEntityById(this.$scope.project.rootDoc_id);
        if (rootDoc == null) {
          return;
        }
        return this._getEntityDirname(rootDoc);
      };

      FileTreeManager.prototype._getEntityDirname = function(entity) {
        var path;
        path = this.getEntityPath(entity);
        if (path == null) {
          return;
        }
        return path.split("/").slice(0, -1).join("/");
      };

      FileTreeManager.prototype._findParentFolder = function(entity) {
        var dirname;
        dirname = this._getEntityDirname(entity);
        if (dirname == null) {
          return;
        }
        return this.findEntityByPath(dirname);
      };

      FileTreeManager.prototype.loadRootFolder = function() {
        var _ref, _ref1;
        return this.$scope.rootFolder = this._parseFolder((_ref = this.$scope) != null ? (_ref1 = _ref.project) != null ? _ref1.rootFolder[0] : void 0 : void 0);
      };

      FileTreeManager.prototype._parseFolder = function(rawFolder) {
        var childFolder, doc, file, folder, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2;
        folder = {
          name: rawFolder.name,
          id: rawFolder._id,
          type: "folder",
          children: [],
          selected: rawFolder._id === this.selected_entity_id
        };
        _ref = rawFolder.docs || [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          doc = _ref[_i];
          folder.children.push({
            name: doc.name,
            id: doc._id,
            type: "doc",
            selected: doc._id === this.selected_entity_id
          });
        }
        _ref1 = rawFolder.fileRefs || [];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          file = _ref1[_j];
          folder.children.push({
            name: file.name,
            id: file._id,
            type: "file",
            selected: file._id === this.selected_entity_id,
            linkedFileData: file.linkedFileData,
            created: file.created
          });
        }
        _ref2 = rawFolder.folders || [];
        for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
          childFolder = _ref2[_k];
          folder.children.push(this._parseFolder(childFolder));
        }
        return folder;
      };

      FileTreeManager.prototype.loadDeletedDocs = function() {
        var doc, _i, _len, _ref, _results;
        this.$scope.deletedDocs = [];
        _ref = this.$scope.project.deletedDocs || [];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          doc = _ref[_i];
          _results.push(this.$scope.deletedDocs.push({
            name: doc.name,
            id: doc._id,
            type: "doc",
            deleted: true
          }));
        }
        return _results;
      };

      FileTreeManager.prototype.recalculateDocList = function() {
        this.$scope.docs = [];
        this.forEachEntity((function(_this) {
          return function(entity, parentFolder, path) {
            if (entity.type === "doc" && !entity.deleted) {
              return _this.$scope.docs.push({
                doc: entity,
                path: path
              });
            }
          };
        })(this));
        return this.$scope.docs.sort(function(a, b) {
          var aDepth, bDepth;
          aDepth = (a.path.match(/\//g) || []).length;
          bDepth = (b.path.match(/\//g) || []).length;
          if (aDepth - bDepth !== 0) {
            return -(aDepth - bDepth);
          } else if (a.path < b.path) {
            return -1;
          } else {
            return 1;
          }
        });
      };

      FileTreeManager.prototype.getEntityPath = function(entity) {
        return this._getEntityPathInFolder(this.$scope.rootFolder, entity);
      };

      FileTreeManager.prototype._getEntityPathInFolder = function(folder, entity) {
        var child, path, _i, _len, _ref;
        _ref = folder.children || [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          child = _ref[_i];
          if (child === entity) {
            return entity.name;
          } else if (child.type === "folder") {
            path = this._getEntityPathInFolder(child, entity);
            if (path != null) {
              return child.name + "/" + path;
            }
          }
        }
        return null;
      };

      FileTreeManager.prototype.getCurrentFolder = function() {
        return this._getCurrentFolder(this.$scope.rootFolder) || this.$scope.rootFolder;
      };

      FileTreeManager.prototype._getCurrentFolder = function(startFolder) {
        var entity, result, _i, _len, _ref;
        if (startFolder == null) {
          startFolder = this.$scope.rootFolder;
        }
        _ref = startFolder.children || [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          entity = _ref[_i];
          if (entity.selected) {
            if (entity.type === "folder") {
              return entity;
            } else {
              return startFolder;
            }
          }
          if (entity.type === "folder") {
            result = this._getCurrentFolder(entity);
            if (result != null) {
              return result;
            }
          }
        }
        return null;
      };

      FileTreeManager.prototype.existsInThisFolder = function(folder, name) {
        var entity, _i, _len, _ref;
        _ref = (folder != null ? folder.children : void 0) || [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          entity = _ref[_i];
          if (entity.name === name) {
            return true;
          }
        }
        return false;
      };

      FileTreeManager.prototype.nameExistsError = function(message) {
        var nameExists;
        if (message == null) {
          message = "already exists";
        }
        nameExists = this.ide.$q.defer();
        nameExists.reject({
          data: message
        });
        return nameExists.promise;
      };

      FileTreeManager.prototype.createDoc = function(name, parent_folder) {
        if (parent_folder == null) {
          parent_folder = this.getCurrentFolder();
        }
        if (this.existsInThisFolder(parent_folder, name)) {
          return this.nameExistsError();
        }
        return this.ide.$http.post("/project/" + this.ide.project_id + "/doc", {
          name: name,
          parent_folder_id: parent_folder != null ? parent_folder.id : void 0,
          _csrf: window.csrfToken
        });
      };

      FileTreeManager.prototype.createFolder = function(name, parent_folder) {
        if (parent_folder == null) {
          parent_folder = this.getCurrentFolder();
        }
        if (this.existsInThisFolder(parent_folder, name)) {
          return this.nameExistsError();
        }
        return this.ide.$http.post("/project/" + this.ide.project_id + "/folder", {
          name: name,
          parent_folder_id: parent_folder != null ? parent_folder.id : void 0,
          _csrf: window.csrfToken
        });
      };

      FileTreeManager.prototype.createLinkedFile = function(name, parent_folder, provider, data) {
        if (parent_folder == null) {
          parent_folder = this.getCurrentFolder();
        }
        if (this.existsInThisFolder(parent_folder, name)) {
          return this.nameExistsError();
        }
        return this.ide.$http.post("/project/" + this.ide.project_id + "/linked_file", {
          name: name,
          parent_folder_id: parent_folder != null ? parent_folder.id : void 0,
          provider: provider,
          data: data,
          _csrf: window.csrfToken
        });
      };

      FileTreeManager.prototype.refreshLinkedFile = function(file) {
        var data, parent_folder, provider;
        parent_folder = this._findParentFolder(file);
        data = file.linkedFileData;
        provider = data != null ? data.provider : void 0;
        if (provider == null) {
          return;
        }
        return this.ide.$http.post("/project/" + this.ide.project_id + "/linked_file", {
          name: file.name,
          parent_folder_id: parent_folder != null ? parent_folder.id : void 0,
          provider: provider,
          data: data,
          _csrf: window.csrfToken
        });
      };

      FileTreeManager.prototype.renameEntity = function(entity, name, callback) {
        var parent_folder;
        if (callback == null) {
          callback = function(error) {};
        }
        if (entity.name === name) {
          return;
        }
        if (name.length >= 150) {
          return;
        }
        parent_folder = this.getCurrentFolder();
        if (this.existsInThisFolder(parent_folder, name)) {
          return this.nameExistsError();
        }
        entity.renamingToName = name;
        return this.ide.$http.post("/project/" + this.ide.project_id + "/" + entity.type + "/" + entity.id + "/rename", {
          name: name,
          _csrf: window.csrfToken
        }).then(function() {
          return entity.name = name;
        })["finally"](function() {
          return entity.renamingToName = null;
        });
      };

      FileTreeManager.prototype.deleteEntity = function(entity, callback) {
        if (callback == null) {
          callback = function(error) {};
        }
        return this.ide.queuedHttp({
          method: "DELETE",
          url: "/project/" + this.ide.project_id + "/" + entity.type + "/" + entity.id,
          headers: {
            "X-Csrf-Token": window.csrfToken
          }
        });
      };

      FileTreeManager.prototype.moveEntity = function(entity, parent_folder, callback) {
        if (callback == null) {
          callback = function(error) {};
        }
        if (this._isChildFolder(entity, parent_folder)) {
          return;
        }
        if (this.existsInThisFolder(parent_folder, entity.name)) {
          return this.nameExistsError();
        }
        return this.ide.queuedHttp.post("/project/" + this.ide.project_id + "/" + entity.type + "/" + entity.id + "/move", {
          folder_id: parent_folder.id,
          _csrf: window.csrfToken
        }).then((function(_this) {
          return function() {
            return _this._moveEntityInScope(entity, parent_folder);
          };
        })(this));
      };

      FileTreeManager.prototype._isChildFolder = function(parent_folder, child_folder) {
        var child_path, parent_path;
        parent_path = this.getEntityPath(parent_folder) || "";
        child_path = this.getEntityPath(child_folder) || "";
        return child_path.slice(0, parent_path.length) === parent_path;
      };

      FileTreeManager.prototype._deleteEntityFromScope = function(entity, options) {
        var index, parent_folder;
        if (options == null) {
          options = {
            moveToDeleted: true
          };
        }
        if (entity == null) {
          return;
        }
        parent_folder = null;
        this.forEachEntity(function(possible_entity, folder) {
          if (possible_entity === entity) {
            return parent_folder = folder;
          }
        });
        if (parent_folder != null) {
          index = parent_folder.children.indexOf(entity);
          if (index > -1) {
            parent_folder.children.splice(index, 1);
          }
        }
        if (entity.type === "doc" && options.moveToDeleted) {
          entity.deleted = true;
          return this.$scope.deletedDocs.push(entity);
        }
      };

      FileTreeManager.prototype._moveEntityInScope = function(entity, parent_folder) {
        if (__indexOf.call(parent_folder.children, entity) >= 0) {
          return;
        }
        this._deleteEntityFromScope(entity, {
          moveToDeleted: false
        });
        return parent_folder.children.push(entity);
      };

      return FileTreeManager;

    })();
  });

}).call(this);

//# sourceMappingURL=FileTreeManager.js.map
