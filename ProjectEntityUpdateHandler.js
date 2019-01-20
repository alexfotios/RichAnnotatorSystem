(function() {
  var Doc, DocstoreManager, DocumentUpdaterHandler, Errors, File, FileStoreHandler, LOCK_NAMESPACE, LockManager, Project, ProjectEntityHandler, ProjectEntityMongoUpdateHandler, ProjectEntityUpdateHandler, ProjectGetter, ProjectLocator, ProjectUpdateHandler, SafePath, TpdsUpdateSender, async, logger, path, self, wrapWithLock, _,
    __slice = [].slice;

  _ = require('lodash');

  async = require('async');

  logger = require('logger-sharelatex');

  path = require('path');

  Doc = require('../../models/Doc').Doc;

  DocstoreManager = require('../Docstore/DocstoreManager');

  DocumentUpdaterHandler = require('../../Features/DocumentUpdater/DocumentUpdaterHandler');

  Errors = require('../Errors/Errors');

  File = require('../../models/File').File;

  FileStoreHandler = require('../FileStore/FileStoreHandler');

  LockManager = require('../../infrastructure/LockManager');

  Project = require('../../models/Project').Project;

  ProjectEntityHandler = require('./ProjectEntityHandler');

  ProjectGetter = require('./ProjectGetter');

  ProjectLocator = require('./ProjectLocator');

  ProjectUpdateHandler = require('./ProjectUpdateHandler');

  ProjectEntityMongoUpdateHandler = require('./ProjectEntityMongoUpdateHandler');

  SafePath = require('./SafePath');

  TpdsUpdateSender = require('../ThirdPartyDataStore/TpdsUpdateSender');

  LOCK_NAMESPACE = "sequentialProjectStructureUpdateLock";

  wrapWithLock = function(methodWithoutLock) {
    var methodWithLock;
    methodWithLock = function() {
      var args, callback, project_id, _i;
      project_id = arguments[0], args = 3 <= arguments.length ? __slice.call(arguments, 1, _i = arguments.length - 1) : (_i = 1, []), callback = arguments[_i++];
      return LockManager.runWithLock(LOCK_NAMESPACE, project_id, function(cb) {
        return methodWithoutLock.apply(null, [project_id].concat(__slice.call(args), [cb]));
      }, callback);
    };
    methodWithLock.withoutLock = methodWithoutLock;
    return methodWithLock;
  };

  module.exports = ProjectEntityUpdateHandler = self = {
    copyFileFromExistingProjectWithProject: function(project, folder_id, originalProject_id, origonalFileRef, userId, callback) {
      var project_id;
      if (callback == null) {
        callback = function(error, fileRef, folder_id) {};
      }
      project_id = project._id;
      logger.log({
        project_id: project_id,
        folder_id: folder_id,
        originalProject_id: originalProject_id,
        origonalFileRef: origonalFileRef
      }, "copying file in s3 with project");
      if (typeof err !== "undefined" && err !== null) {
        return callback(err);
      }
      return ProjectEntityMongoUpdateHandler._confirmFolder(project, folder_id, (function(_this) {
        return function(folder_id) {
          var fileRef;
          if (origonalFileRef == null) {
            logger.err({
              project_id: project_id,
              folder_id: folder_id,
              originalProject_id: originalProject_id,
              origonalFileRef: origonalFileRef
            }, "file trying to copy is null");
            return callback();
          }
          fileRef = new File({
            name: SafePath.clean(origonalFileRef.name)
          });
          return FileStoreHandler.copyFile(originalProject_id, origonalFileRef._id, project._id, fileRef._id, function(err, fileStoreUrl) {
            if (err != null) {
              logger.err({
                err: err,
                project_id: project_id,
                folder_id: folder_id,
                originalProject_id: originalProject_id,
                origonalFileRef: origonalFileRef
              }, "error coping file in s3");
              return callback(err);
            }
            return ProjectEntityMongoUpdateHandler._putElement(project, folder_id, fileRef, "file", (function(_this) {
              return function(err, result) {
                var _ref;
                if (err != null) {
                  logger.err({
                    err: err,
                    project_id: project_id,
                    folder_id: folder_id
                  }, "error putting element as part of copy");
                  return callback(err);
                }
                return TpdsUpdateSender.addFile({
                  project_id: project_id,
                  file_id: fileRef._id,
                  path: result != null ? (_ref = result.path) != null ? _ref.fileSystem : void 0 : void 0,
                  rev: fileRef.rev,
                  project_name: project.name
                }, function(err) {
                  var newFiles, _ref1;
                  if (err != null) {
                    logger.err({
                      err: err,
                      project_id: project_id,
                      folder_id: folder_id,
                      originalProject_id: originalProject_id,
                      origonalFileRef: origonalFileRef
                    }, "error sending file to tpds worker");
                  }
                  newFiles = [
                    {
                      file: fileRef,
                      path: result != null ? (_ref1 = result.path) != null ? _ref1.fileSystem : void 0 : void 0,
                      url: fileStoreUrl
                    }
                  ];
                  return DocumentUpdaterHandler.updateProjectStructure(project_id, userId, {
                    newFiles: newFiles
                  }, function(error) {
                    if (error != null) {
                      return callback(error);
                    }
                    return callback(null, fileRef, folder_id);
                  });
                });
              };
            })(this));
          });
        };
      })(this));
    },
    updateDocLines: function(project_id, doc_id, lines, version, ranges, callback) {
      if (callback == null) {
        callback = function(error) {};
      }
      return ProjectGetter.getProjectWithoutDocLines(project_id, function(err, project) {
        if (err != null) {
          return callback(err);
        }
        if (project == null) {
          return callback(new Errors.NotFoundError("project not found"));
        }
        logger.log({
          project_id: project_id,
          doc_id: doc_id
        }, "updating doc lines");
        return ProjectLocator.findElement({
          project: project,
          element_id: doc_id,
          type: "docs"
        }, function(err, doc, path) {
          var isDeletedDoc;
          isDeletedDoc = false;
          if (err != null) {
            if (err instanceof Errors.NotFoundError) {
              isDeletedDoc = true;
              doc = _.find(project.deletedDocs, function(doc) {
                return doc._id.toString() === doc_id.toString();
              });
            } else {
              return callback(err);
            }
          }
          if (doc == null) {
            logger.error({
              doc_id: doc_id,
              project_id: project_id,
              lines: lines
            }, "doc not found while updating doc lines");
            return callback(new Errors.NotFoundError('doc not found'));
          }
          logger.log({
            project_id: project_id,
            doc_id: doc_id
          }, "telling docstore manager to update doc");
          return DocstoreManager.updateDoc(project_id, doc_id, lines, version, ranges, function(err, modified, rev) {
            if (err != null) {
              logger.error({
                err: err,
                doc_id: doc_id,
                project_id: project_id,
                lines: lines
              }, "error sending doc to docstore");
              return callback(err);
            }
            logger.log({
              project_id: project_id,
              doc_id: doc_id,
              modified: modified
            }, "finished updating doc lines");
            if (modified && !isDeletedDoc) {
              ProjectUpdateHandler.markAsUpdated(project_id);
              return TpdsUpdateSender.addDoc({
                project_id: project_id,
                path: path.fileSystem,
                doc_id: doc_id,
                project_name: project.name,
                rev: rev
              }, callback);
            } else {
              return callback();
            }
          });
        });
      });
    },
    setRootDoc: function(project_id, newRootDocID, callback) {
      if (callback == null) {
        callback = function(error) {};
      }
      logger.log({
        project_id: project_id,
        rootDocId: newRootDocID
      }, "setting root doc");
      return Project.update({
        _id: project_id
      }, {
        rootDoc_id: newRootDocID
      }, {}, callback);
    },
    unsetRootDoc: function(project_id, callback) {
      if (callback == null) {
        callback = function(error) {};
      }
      logger.log({
        project_id: project_id
      }, "removing root doc");
      return Project.update({
        _id: project_id
      }, {
        $unset: {
          rootDoc_id: true
        }
      }, {}, callback);
    },
    restoreDoc: function(project_id, doc_id, name, callback) {
      if (callback == null) {
        callback = function(error, doc, folder_id) {};
      }
      if (!SafePath.isCleanFilename(name)) {
        return callback(new Errors.InvalidNameError("invalid element name"));
      }
      return ProjectEntityHandler.getDoc(project_id, doc_id, {
        include_deleted: true
      }, function(error, lines) {
        if (error != null) {
          return callback(error);
        }
        return self.addDoc(project_id, null, name, lines, callback);
      });
    },
    addDoc: wrapWithLock((function(_this) {
      return function(project_id, folder_id, docName, docLines, userId, callback) {
        if (callback == null) {
          callback = function(error, doc, folder_id) {};
        }
        return self.addDocWithoutUpdatingHistory.withoutLock(project_id, folder_id, docName, docLines, userId, function(error, doc, folder_id, path) {
          var newDocs;
          if (error != null) {
            return callback(error);
          }
          newDocs = [
            {
              doc: doc,
              path: path,
              docLines: docLines.join('\n')
            }
          ];
          return DocumentUpdaterHandler.updateProjectStructure(project_id, userId, {
            newDocs: newDocs
          }, function(error) {
            if (error != null) {
              return callback(error);
            }
            return callback(null, doc, folder_id);
          });
        });
      };
    })(this)),
    addFile: wrapWithLock(function(project_id, folder_id, fileName, fsPath, linkedFileData, userId, callback) {
      if (callback == null) {
        callback = function(error, fileRef, folder_id) {};
      }
      return self.addFileWithoutUpdatingHistory.withoutLock(project_id, folder_id, fileName, fsPath, linkedFileData, userId, function(error, fileRef, folder_id, path, fileStoreUrl) {
        var newFiles;
        if (error != null) {
          return callback(error);
        }
        newFiles = [
          {
            file: fileRef,
            path: path,
            url: fileStoreUrl
          }
        ];
        return DocumentUpdaterHandler.updateProjectStructure(project_id, userId, {
          newFiles: newFiles
        }, function(error) {
          if (error != null) {
            return callback(error);
          }
          return callback(null, fileRef, folder_id);
        });
      });
    }),
    replaceFile: wrapWithLock(function(project_id, file_id, fsPath, linkedFileData, userId, callback) {
      return FileStoreHandler.uploadFileFromDisk(project_id, file_id, fsPath, function(err, fileStoreUrl) {
        if (err != null) {
          return callback(err);
        }
        return ProjectEntityMongoUpdateHandler.replaceFile(project_id, file_id, linkedFileData, function(err, fileRef, project, path) {
          var newFiles;
          if (err != null) {
            return callback(err);
          }
          newFiles = [
            {
              file: fileRef,
              path: path.fileSystem,
              url: fileStoreUrl
            }
          ];
          return TpdsUpdateSender.addFile({
            project_id: project._id,
            file_id: fileRef._id,
            path: path.fileSystem,
            rev: fileRef.rev + 1,
            project_name: project.name
          }, function(err) {
            if (err != null) {
              return callback(err);
            }
            return DocumentUpdaterHandler.updateProjectStructure(project_id, userId, {
              newFiles: newFiles
            }, callback);
          });
        });
      });
    }),
    addDocWithoutUpdatingHistory: wrapWithLock((function(_this) {
      return function(project_id, folder_id, docName, docLines, userId, callback) {
        var doc;
        if (callback == null) {
          callback = function(error, doc, folder_id) {};
        }
        if (!SafePath.isCleanFilename(docName)) {
          return callback(new Errors.InvalidNameError("invalid element name"));
        }
        doc = new Doc({
          name: docName
        });
        return DocstoreManager.updateDoc(project_id.toString(), doc._id.toString(), docLines, 0, {}, function(err, modified, rev) {
          if (err != null) {
            return callback(err);
          }
          return ProjectEntityMongoUpdateHandler.addDoc(project_id, folder_id, doc, function(err, result, project) {
            var _ref;
            if (err != null) {
              return callback(err);
            }
            return TpdsUpdateSender.addDoc({
              project_id: project_id,
              doc_id: doc != null ? doc._id : void 0,
              path: result != null ? (_ref = result.path) != null ? _ref.fileSystem : void 0 : void 0,
              project_name: project.name,
              rev: 0
            }, function(err) {
              var _ref1;
              if (err != null) {
                return callback(err);
              }
              return callback(null, doc, folder_id, result != null ? (_ref1 = result.path) != null ? _ref1.fileSystem : void 0 : void 0);
            });
          });
        });
      };
    })(this)),
    addFileWithoutUpdatingHistory: wrapWithLock(function(project_id, folder_id, fileName, fsPath, linkedFileData, userId, callback) {
      var fileRef;
      if (callback == null) {
        callback = function(error, fileRef, folder_id, path, fileStoreUrl) {};
      }
      if (!SafePath.isCleanFilename(fileName)) {
        return callback(new Errors.InvalidNameError("invalid element name"));
      }
      fileRef = new File({
        name: fileName,
        linkedFileData: linkedFileData
      });
      return FileStoreHandler.uploadFileFromDisk(project_id, fileRef._id, fsPath, function(err, fileStoreUrl) {
        if (err != null) {
          logger.err({
            err: err,
            project_id: project_id,
            folder_id: folder_id,
            file_name: fileName,
            fileRef: fileRef
          }, "error uploading image to s3");
          return callback(err);
        }
        return ProjectEntityMongoUpdateHandler.addFile(project_id, folder_id, fileRef, function(err, result, project) {
          var _ref;
          if (err != null) {
            logger.err({
              err: err,
              project_id: project_id,
              folder_id: folder_id,
              file_name: fileName,
              fileRef: fileRef
            }, "error adding file with project");
            return callback(err);
          }
          return TpdsUpdateSender.addFile({
            project_id: project_id,
            file_id: fileRef._id,
            path: result != null ? (_ref = result.path) != null ? _ref.fileSystem : void 0 : void 0,
            project_name: project.name,
            rev: fileRef.rev
          }, function(err) {
            var _ref1;
            if (err != null) {
              return callback(err);
            }
            return callback(null, fileRef, folder_id, result != null ? (_ref1 = result.path) != null ? _ref1.fileSystem : void 0 : void 0, fileStoreUrl);
          });
        });
      });
    }),
    upsertDoc: wrapWithLock(function(project_id, folder_id, docName, docLines, source, userId, callback) {
      if (callback == null) {
        callback = function(err, doc, folder_id, isNewDoc) {};
      }
      return ProjectLocator.findElement({
        project_id: project_id,
        element_id: folder_id,
        type: "folder"
      }, function(error, folder) {
        var doc, existingDoc, _i, _len, _ref;
        if (error != null) {
          return callback(error);
        }
        if (folder == null) {
          return callback(new Error("Couldn't find folder"));
        }
        existingDoc = null;
        _ref = folder.docs;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          doc = _ref[_i];
          if (doc.name === docName) {
            existingDoc = doc;
            break;
          }
        }
        if (existingDoc != null) {
          return DocumentUpdaterHandler.setDocument(project_id, existingDoc._id, userId, docLines, source, (function(_this) {
            return function(err) {
              logger.log({
                project_id: project_id,
                doc_id: existingDoc._id
              }, "notifying users that the document has been updated");
              return DocumentUpdaterHandler.flushDocToMongo(project_id, existingDoc._id, function(err) {
                if (err != null) {
                  return callback(err);
                }
                return callback(null, existingDoc, existingDoc == null);
              });
            };
          })(this));
        } else {
          return self.addDoc.withoutLock(project_id, folder_id, docName, docLines, userId, function(err, doc) {
            if (err != null) {
              return callback(err);
            }
            return callback(null, doc, existingDoc == null);
          });
        }
      });
    }),
    upsertFile: wrapWithLock(function(project_id, folder_id, fileName, fsPath, linkedFileData, userId, callback) {
      if (callback == null) {
        callback = function(err, file, isNewFile) {};
      }
      return ProjectLocator.findElement({
        project_id: project_id,
        element_id: folder_id,
        type: "folder"
      }, function(error, folder) {
        var existingFile, fileRef, _i, _len, _ref;
        if (error != null) {
          return callback(error);
        }
        if (folder == null) {
          return callback(new Error("Couldn't find folder"));
        }
        existingFile = null;
        _ref = folder.fileRefs;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          fileRef = _ref[_i];
          if (fileRef.name === fileName) {
            existingFile = fileRef;
            break;
          }
        }
        if (existingFile != null) {
          return self.replaceFile.withoutLock(project_id, existingFile._id, fsPath, linkedFileData, userId, function(err) {
            if (err != null) {
              return callback(err);
            }
            return callback(null, existingFile, existingFile == null);
          });
        } else {
          return self.addFile.withoutLock(project_id, folder_id, fileName, fsPath, linkedFileData, userId, function(err, file) {
            if (err != null) {
              return callback(err);
            }
            return callback(null, file, existingFile == null);
          });
        }
      });
    }),
    upsertDocWithPath: wrapWithLock(function(project_id, elementPath, docLines, source, userId, callback) {
      var docName, folderPath;
      docName = path.basename(elementPath);
      folderPath = path.dirname(elementPath);
      return self.mkdirp.withoutLock(project_id, folderPath, function(err, newFolders, folder) {
        if (err != null) {
          return callback(err);
        }
        return self.upsertDoc.withoutLock(project_id, folder._id, docName, docLines, source, userId, function(err, doc, isNewDoc) {
          if (err != null) {
            return callback(err);
          }
          return callback(null, doc, isNewDoc, newFolders, folder);
        });
      });
    }),
    upsertFileWithPath: wrapWithLock(function(project_id, elementPath, fsPath, linkedFileData, userId, callback) {
      var fileName, folderPath;
      fileName = path.basename(elementPath);
      folderPath = path.dirname(elementPath);
      return self.mkdirp.withoutLock(project_id, folderPath, function(err, newFolders, folder) {
        if (err != null) {
          return callback(err);
        }
        return self.upsertFile.withoutLock(project_id, folder._id, fileName, fsPath, linkedFileData, userId, function(err, file, isNewFile) {
          if (err != null) {
            return callback(err);
          }
          return callback(null, file, isNewFile, newFolders, folder);
        });
      });
    }),
    deleteEntity: wrapWithLock(function(project_id, entity_id, entityType, userId, callback) {
      if (callback == null) {
        callback = function(error) {};
      }
      logger.log({
        entity_id: entity_id,
        entityType: entityType,
        project_id: project_id
      }, "deleting project entity");
      if (entityType == null) {
        logger.err({
          err: "No entityType set",
          project_id: project_id,
          entity_id: entity_id
        });
        return callback("No entityType set");
      }
      entityType = entityType.toLowerCase();
      return ProjectEntityMongoUpdateHandler.deleteEntity(project_id, entity_id, entityType, function(error, entity, path, projectBeforeDeletion) {
        if (error != null) {
          return callback(error);
        }
        return self._cleanUpEntity(projectBeforeDeletion, entity, entityType, path.fileSystem, userId, function(error) {
          if (error != null) {
            return callback(error);
          }
          return TpdsUpdateSender.deleteEntity({
            project_id: project_id,
            path: path.fileSystem,
            project_name: projectBeforeDeletion.name
          }, function(error) {
            if (error != null) {
              return callback(error);
            }
            return callback(null, entity_id);
          });
        });
      });
    }),
    deleteEntityWithPath: wrapWithLock(function(project_id, path, userId, callback) {
      return ProjectLocator.findElementByPath({
        project_id: project_id,
        path: path
      }, function(err, element, type) {
        if (err != null) {
          return callback(err);
        }
        if (element == null) {
          return callback(new Errors.NotFoundError("project not found"));
        }
        return self.deleteEntity.withoutLock(project_id, element._id, type, userId, callback);
      });
    }),
    mkdirp: wrapWithLock(function(project_id, path, callback) {
      if (callback == null) {
        callback = function(err, newlyCreatedFolders, lastFolderInPath) {};
      }
      return ProjectEntityMongoUpdateHandler.mkdirp(project_id, path, callback);
    }),
    addFolder: wrapWithLock(function(project_id, parentFolder_id, folderName, callback) {
      if (!SafePath.isCleanFilename(folderName)) {
        return callback(new Errors.InvalidNameError("invalid element name"));
      }
      return ProjectEntityMongoUpdateHandler.addFolder(project_id, parentFolder_id, folderName, callback);
    }),
    moveEntity: wrapWithLock(function(project_id, entity_id, destFolderId, entityType, userId, callback) {
      if (callback == null) {
        callback = function(error) {};
      }
      logger.log({
        entityType: entityType,
        entity_id: entity_id,
        project_id: project_id,
        destFolderId: destFolderId
      }, "moving entity");
      if (entityType == null) {
        logger.err({
          err: "No entityType set",
          project_id: project_id,
          entity_id: entity_id
        });
        return callback("No entityType set");
      }
      entityType = entityType.toLowerCase();
      return ProjectEntityMongoUpdateHandler.moveEntity(project_id, entity_id, destFolderId, entityType, function(err, project_name, startPath, endPath, rev, changes) {
        if (err != null) {
          return callback(err);
        }
        TpdsUpdateSender.moveEntity({
          project_id: project_id,
          project_name: project_name,
          startPath: startPath,
          endPath: endPath,
          rev: rev
        });
        return DocumentUpdaterHandler.updateProjectStructure(project_id, userId, changes, callback);
      });
    }),
    renameEntity: wrapWithLock(function(project_id, entity_id, entityType, newName, userId, callback) {
      if (!SafePath.isCleanFilename(newName)) {
        return callback(new Errors.InvalidNameError("invalid element name"));
      }
      logger.log({
        entity_id: entity_id,
        project_id: project_id
      }, 'renaming ' + entityType);
      if (entityType == null) {
        logger.err({
          err: "No entityType set",
          project_id: project_id,
          entity_id: entity_id
        });
        return callback("No entityType set");
      }
      entityType = entityType.toLowerCase();
      return ProjectEntityMongoUpdateHandler.renameEntity(project_id, entity_id, entityType, newName, function(err, project_name, startPath, endPath, rev, changes) {
        if (err != null) {
          return callback(err);
        }
        TpdsUpdateSender.moveEntity({
          project_id: project_id,
          startPath: startPath,
          endPath: endPath,
          project_name: project_name,
          rev: rev
        });
        return DocumentUpdaterHandler.updateProjectStructure(project_id, userId, changes, callback);
      });
    }),
    _cleanUpEntity: function(project, entity, entityType, path, userId, callback) {
      if (callback == null) {
        callback = function(error) {};
      }
      if (entityType.indexOf("file") !== -1) {
        return self._cleanUpFile(project, entity, path, userId, callback);
      } else if (entityType.indexOf("doc") !== -1) {
        return self._cleanUpDoc(project, entity, path, userId, callback);
      } else if (entityType.indexOf("folder") !== -1) {
        return self._cleanUpFolder(project, entity, path, userId, callback);
      } else {
        return callback();
      }
    },
    _cleanUpDoc: function(project, doc, path, userId, callback) {
      var doc_id, project_id, unsetRootDocIfRequired;
      if (callback == null) {
        callback = function(error) {};
      }
      project_id = project._id.toString();
      doc_id = doc._id.toString();
      unsetRootDocIfRequired = (function(_this) {
        return function(callback) {
          if ((project.rootDoc_id != null) && project.rootDoc_id.toString() === doc_id) {
            return _this.unsetRootDoc(project_id, callback);
          } else {
            return callback();
          }
        };
      })(this);
      return unsetRootDocIfRequired(function(error) {
        if (error != null) {
          return callback(error);
        }
        return self._insertDeletedDocReference(project._id, doc, function(error) {
          if (error != null) {
            return callback(error);
          }
          return DocumentUpdaterHandler.deleteDoc(project_id, doc_id, function(error) {
            if (error != null) {
              return callback(error);
            }
            return DocstoreManager.deleteDoc(project_id, doc_id, function(error) {
              var changes;
              if (error != null) {
                return callback(error);
              }
              changes = {
                oldDocs: [
                  {
                    doc: doc,
                    path: path
                  }
                ]
              };
              return DocumentUpdaterHandler.updateProjectStructure(project_id, userId, changes, callback);
            });
          });
        });
      });
    },
    _cleanUpFile: function(project, file, path, userId, callback) {
      var file_id, project_id;
      if (callback == null) {
        callback = function(error) {};
      }
      project_id = project._id.toString();
      file_id = file._id.toString();
      return FileStoreHandler.deleteFile(project_id, file_id, function(error) {
        var changes;
        if (error != null) {
          return callback(error);
        }
        changes = {
          oldFiles: [
            {
              file: file,
              path: path
            }
          ]
        };
        return DocumentUpdaterHandler.updateProjectStructure(project_id, userId, changes, callback);
      });
    },
    _cleanUpFolder: function(project, folder, folderPath, userId, callback) {
      var childFolder, doc, file, jobs, _fn, _fn1, _fn2, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2;
      if (callback == null) {
        callback = function(error) {};
      }
      jobs = [];
      _ref = folder.docs;
      _fn = function(doc) {
        var docPath;
        docPath = path.join(folderPath, doc.name);
        return jobs.push(function(callback) {
          return self._cleanUpDoc(project, doc, docPath, userId, callback);
        });
      };
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        doc = _ref[_i];
        _fn(doc);
      }
      _ref1 = folder.fileRefs;
      _fn1 = function(file) {
        var filePath;
        filePath = path.join(folderPath, file.name);
        return jobs.push(function(callback) {
          return self._cleanUpFile(project, file, filePath, userId, callback);
        });
      };
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        file = _ref1[_j];
        _fn1(file);
      }
      _ref2 = folder.folders;
      _fn2 = function(childFolder) {
        folderPath = path.join(folderPath, childFolder.name);
        return jobs.push(function(callback) {
          return self._cleanUpFolder(project, childFolder, folderPath, userId, callback);
        });
      };
      for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
        childFolder = _ref2[_k];
        _fn2(childFolder);
      }
      return async.series(jobs, callback);
    },
    _insertDeletedDocReference: function(project_id, doc, callback) {
      if (callback == null) {
        callback = function(error) {};
      }
      return Project.update({
        _id: project_id
      }, {
        $push: {
          deletedDocs: {
            _id: doc._id,
            name: doc.name
          }
        }
      }, {}, callback);
    }
  };

}).call(this);
