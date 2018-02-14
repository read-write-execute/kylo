define(['angular',"feed-mgr/module-name", "pascalprecht.translate"], function (angular,moduleName) {

    var directive = function() {
        return {
            restrict: "EA",
            bindToController: {
                mode: '@',
                scrollResults: '=?',
                allowExecuteQuery: '=?',
                allowDatabaseBrowse: '=?',
                allowFullscreen: '=?',
                defaultSchemaName: '@',
                defaultTableName: '@',
                datasourceId: '@'
            },
            controllerAs: 'vm',
            scope: {},
            templateUrl: 'js/feed-mgr/shared/hql-editor/hql-editor.html',
            controller: "HqlEditorController",
            require: "ngModel",
            link: function($scope, element, attrs, ngModel) {
                ngModel.$render = function() {
                    if (ngModel.$viewValue != '') {
                        $scope.vm.sql = ngModel.$viewValue;
                    }
                };
                $scope.$watch("vm.sql", function() {
                    ngModel.$setViewValue($scope.vm.sql);
                });
            }
        };
    };

    var controller = function($scope, $element, $mdDialog, $mdToast, $http, $filter, RestUrlService, StateService, HiveService, DatasourcesService, CodeMirrorService) {

        var self = this;
        var init = function() {
            getTable();
            if (self.defaultSchemaName == undefined) {
                self.defaultSchemaName = null;
            }
            if (self.defaultTableName == undefined) {
                self.defaultTableName = null;
            }
            if (self.allowFullscreen == undefined) {
                self.allowFullscreen = true;
            }

            if (self.allowExecuteQuery == undefined) {
                self.allowExecuteQuery = false;
            }
            if (self.allowDatabaseBrowse == undefined) {
                self.allowDatabaseBrowse = false;
            }
            if (self.defaultSchemaName != null && self.defaultTableName != null) {
                self.sql = "SELECT * FROM " + quote(self.defaultSchemaName) + "." + quote(self.defaultTableName) + " LIMIT 20";
                if (self.allowExecuteQuery) {
                    self.query();
                }
            }
        };
        this.loadingHiveSchemas = false;
        this.metadataMessage = "";
        var metadataLoadedMessage = $filter('translate')('views.hql-editor.UseCTRL');
        var metadataLoadingMessage = $filter('translate')('views.hql-editor.LoadingTable');
        var metadataErrorMessage = $filter('translate')('views.hql-editor.UnableTlt');

        this.codemirrorOptions = {
            lineWrapping: true,
            indentWithTabs: true,
            smartIndent: true,
            lineNumbers: true,
            matchBrackets: true,
            autofocus: true,
            extraKeys: {'Ctrl-Space': 'autocomplete'},
            hint: CodeMirror.hint.sql,
            hintOptions: {
                tables: {}
            },
            mode: self.datasource && self.datasource.isHive ? 'text/x-hive' : 'text/x-sql'
        };

        this.databaseMetadata = {};
        this.browseDatabaseName = null;
        this.browseTableName = null;
        this.databaseNames = [];
        this.browseResults = null;

        function quote(expression) {
            if (self.datasource.isHive) {
                return "`" + expression + "`";
            } else {
                return expression;
            }
        }

        function getTable() {
            self.loadingHiveSchemas = true;
            self.metadataMessage = metadataLoadingMessage;
            var successFn = function(data) {
                var codeMirrorData = CodeMirrorService.transformToCodeMirrorData(data);
                if(codeMirrorData && codeMirrorData.hintOptions && codeMirrorData.hintOptions.tables) {
                    self.codemirrorOptions.hintOptions.tables = codeMirrorData.hintOptions.tables;
                }
                self.loadingHiveSchemas = false;
                self.databaseMetadata = codeMirrorData.databaseMetadata;
                self.databaseNames = codeMirrorData.databaseNames;
                self.metadataMessage = metadataLoadedMessage
            };
            var errorFn = function(err) {
                self.loadingHiveSchemas = false;
                self.metadataMessage = metadataErrorMessage

            };

            var promise;
            if (self.datasource.isHive) {
                promise = HiveService.getTablesAndColumns();
            } else {
                promise = DatasourcesService.getTablesAndColumns(self.datasourceId, self.defaultSchemaName);
            }
            promise.then(successFn, errorFn);
            return promise;
        }

        this.query = function() {
            this.executingQuery = true;
            var successFn = function(tableData) {
                self.executingQuery = false;
                var result = self.queryResults = HiveService.transformQueryResultsToUiGridModel(tableData);
                self.gridOptions.columnDefs = result.columns;
                self.gridOptions.data = result.rows;
            };
            var errorFn = function (err) {
                self.executingQuery = false;
            };
            var promise;
            if (self.datasource.isHive) {
                promise = HiveService.queryResult(self.sql);
            } else {
                promise = DatasourcesService.query(self.datasourceId, self.sql);
            }
            return promise.then(successFn, errorFn);
        };

        //Setup initial grid options
        this.gridOptions = {
            columnDefs: [],
            data: null,
            enableColumnResizing: true,
            enableGridMenu: true,
            flatEntityAccess: true
        };

        this.fullscreen = function() {
            $mdDialog.show({
                controller: 'HqlFullScreenEditorController',
                controllerAs: 'vm',
                templateUrl: 'js/feed-mgr/shared/hql-editor/hql-editor-fullscreen.html',
                parent: angular.element(document.body),
                clickOutsideToClose: false,
                fullscreen: true,
                locals: {
                    hql: self.sql,
                    defaultSchemaName: self.defaultSchemaName,
                    defaultTableName: self.defaultTableName,
                    allowExecuteQuery: self.allowExecuteQuery,
                    allowDatabaseBrowse: self.allowDatabaseBrowse,
                    mode: self.mode
                }
            }).then(function(msg) {

            }, function() {

            });
        };

        this.browseTable = function() {
            self.executingQuery = true;
            return HiveService.browseTable(this.browseDatabaseName, this.browseTableName, null).then(function(tableData) {
                self.executingQuery = false;
                self.queryResults = HiveService.transformQueryResultsToUiGridModel(tableData);
            }, function(err) {
                self.executingQuery = false;
                $mdDialog.show(
                        $mdDialog.alert()
                                .parent(angular.element(document.querySelector('#hqlEditorContainer')))
                                .clickOutsideToClose(true)
                                .title('Cannot browse the table')
                                .textContent('Error Browsing the data ')
                                .ariaLabel('Error browsing the data')
                                .ok('Got it!')
                        //.targetEvent(ev)
                );
            });
        };

        function getDatasource(datasourceId) {
            self.executingQuery = true;
            var successFn = function (response) {
                self.datasource = response;
                self.executingQuery = false;
            };
            var errorFn = function (err) {
                self.executingQuery = false;
            };
            return DatasourcesService.findById(datasourceId).then(successFn, errorFn);
        }

        getDatasource(self.datasourceId).then(init);
    };

    angular.module(moduleName).controller('HqlEditorController', ["$scope","$element","$mdDialog","$mdToast","$http","$filter","RestUrlService","StateService","HiveService","DatasourcesService","CodeMirrorService",controller]);
    angular.module(moduleName).directive('thinkbigHqlEditor', directive);



    var HqlFullScreenEditorController = function ($scope, $mdDialog, hql, defaultSchemaName, defaultTableName, allowExecuteQuery, allowDatabaseBrowse, mode) {

        var self = this;
        this.hql = hql;
        this.defaultSchemaName = defaultSchemaName;
        this.defaultTableName = defaultTableName;
        this.allowExecuteQuery = allowExecuteQuery;
        this.allowDatabaseBrowse = allowDatabaseBrowse;
        this.mode = mode;

        $scope.cancel = function($event) {
            $mdDialog.hide();
        };

    };
    angular.module(moduleName).controller('HqlFullScreenEditorController', ["$scope","$mdDialog","hql","defaultSchemaName","defaultTableName","allowExecuteQuery","allowDatabaseBrowse","mode",HqlFullScreenEditorController]);


});
