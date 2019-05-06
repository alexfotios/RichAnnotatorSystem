(function() {
  var Folder, HistoryManager, ObjectId, Path, Project, ProjectCreationHandler, ProjectDetailsHandler, ProjectEntityUpdateHandler, Settings, User, async, fs, logger, metrics, _;

  logger = require('logger-sharelatex');

  async = require("async");

  metrics = require('metrics-sharelatex');

  Settings = require('settings-sharelatex');

  ObjectId = require('mongoose').Types.ObjectId;

  Project = require('../../models/Project').Project;

  Folder = require('../../models/Folder').Folder;

  ProjectEntityUpdateHandler = require('./ProjectEntityUpdateHandler');

  ProjectDetailsHandler = require('./ProjectDetailsHandler');

  HistoryManager = require('../History/HistoryManager');

  User = require('../../models/User').User;

  fs = require('fs');

  Path = require("path");

  _ = require("underscore");

  module.exports = ProjectCreationHandler = {
    createBlankProject: function(owner_id, projectName, projectHistoryId, callback) {
      if (callback == null) {
        callback = function(error, project) {};
      }
      metrics.inc("project-creation");
      if (arguments.length === 3) {
        callback = projectHistoryId;
        projectHistoryId = null;
      }
      return ProjectDetailsHandler.validateProjectName(projectName, function(error) {
        if (error != null) {
          return callback(error);
        }
        logger.log({
          owner_id: owner_id,
          projectName: projectName
        }, "creating blank project");
        if (projectHistoryId != null) {
          return ProjectCreationHandler._createBlankProject(owner_id, projectName, projectHistoryId, callback);
        } else {
          return HistoryManager.initializeProject(function(error, history) {
            if (error != null) {
              return callback(error);
            }
            return ProjectCreationHandler._createBlankProject(owner_id, projectName, history != null ? history.overleaf_id : void 0, callback);
          });
        }
      });
    },
    _createBlankProject: function(owner_id, projectName, projectHistoryId, callback) {
      var project, rootFolder, _ref, _ref1;
      if (callback == null) {
        callback = function(error, project) {};
      }
      rootFolder = new Folder({
        'name': 'rootFolder'
      });
      project = new Project({
        owner_ref: new ObjectId(owner_id),
        name: projectName
      });
      project.overleaf.history.id = projectHistoryId;
      if ((_ref = Settings.apis) != null ? (_ref1 = _ref.project_history) != null ? _ref1.displayHistoryForNewProjects : void 0 : void 0) {
        project.overleaf.history.display = true;
      }
      if (Settings.currentImageName != null) {
        project.imageName = Settings.currentImageName;
      }
      project.rootFolder[0] = rootFolder;
      return User.findById(owner_id, "ace.spellCheckLanguage", function(err, user) {
        project.spellCheckLanguage = user.ace.spellCheckLanguage;
        return project.save(function(err) {
          if (err != null) {
            return callback(err);
          }
          return callback(err, project);
        });
      });
    },
    createBasicProject: function(owner_id, projectName, callback) {
      var self;
      if (callback == null) {
        callback = function(error, project) {};
      }
      self = this;
      return this.createBlankProject(owner_id, projectName, function(error, project) {
        if (error != null) {
          return callback(error);
        }
        return self._buildTemplate("mainbasic.tex", owner_id, projectName, function(error, docLines) {
          if (error != null) {
            return callback(error);
          }
          return ProjectEntityUpdateHandler.addDoc(project._id, project.rootFolder[0]._id, "some.md", docLines, owner_id, function(error, doc) {
            if (error != null) {
              logger.err({
                err: error
              }, "error adding doc when creating basic project");
              return callback(error);
            }
            return ProjectEntityUpdateHandler.setRootDoc(project._id, doc._id, function(error) {
              return callback(error, project);
            });
          });
        });
    
      });
    },
    createExampleProject: function(owner_id, projectName, callback) {
      var self;
      if (callback == null) {
        callback = function(error, project) {};
      }
      self = this;
      return this.createBlankProject(owner_id, projectName, function(error, project) {
        if (error != null) {
          return callback(error);
        }
        return async.series([
          function(callback) {
            return self._buildTemplate("main.tex", owner_id, projectName, function(error, docLines) {
              if (error != null) {
                return callback(error);
              }
              return ProjectEntityUpdateHandler.addDoc(project._id, project.rootFolder[0]._id, "main.tex", docLines, owner_id, function(error, doc) {
                if (error != null) {
                  return callback(error);
                }
                return ProjectEntityUpdateHandler.setRootDoc(project._id, doc._id, callback);
              });
            });
          }, function(callback) {
            return self._buildTemplate("references.bib", owner_id, projectName, function(error, docLines) {
              if (error != null) {
                return callback(error);
              }
              return ProjectEntityUpdateHandler.addDoc(project._id, project.rootFolder[0]._id, "references.bib", docLines, owner_id, function(error, doc) {
                return callback(error);
              });
            });
          }, function(callback) {
            var universePath;
            universePath = Path.resolve(__dirname + "/../../../templates/project_files/universe.jpg");
            return ProjectEntityUpdateHandler.addFile(project._id, project.rootFolder[0]._id, "universe.jpg", universePath, null, owner_id, callback);
          }
        ], function(error) {
          return callback(error, project);
        });
      });
    },
    _buildTemplate: function(template_name, user_id, project_name, callback) {
      if (callback == null) {
        callback = function(error, output) {};
      }
      return User.findById(user_id, "first_name last_name", function(error, user) {
        var monthNames, templatePath;
        if (error != null) {
          return callback(error);
        }
        monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        templatePath = Path.resolve(__dirname + ("/../../../templates/project_files/" + template_name));
        return fs.readFile(templatePath, function(error, template) {
          var data, output;
          if (error != null) {
            return callback(error);
          }
          data = {
            project_name: project_name,
            user: user,
            year: new Date().getUTCFullYear(),
            month: monthNames[new Date().getUTCMonth()]
          };
          output = _.template(template.toString(), data);
          return callback(null, output.split("\n"));
        });
      });
    }
  };

  metrics.timeAsyncMethod(ProjectCreationHandler, 'createBlankProject', 'mongo.ProjectCreationHandler', logger);

}).call(this);
