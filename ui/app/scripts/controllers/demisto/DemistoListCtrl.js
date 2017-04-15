(function() {
    'use strict';
    angular.module('theHiveControllers')
        .controller('DemistoListCtrl', function($scope, $q, $state, $uibModal, DemistoSrv, AlertSrv) {
            var self = this;

            self.list = [];
            self.selection = [];
            self.menu = {
                follow: false,
                unfollow: false,
                selectAll: false
            };

            self.follow = function(event) {
                var fn = angular.noop;

                if (event.follow === true) {
                    fn = DemistoSrv.unfollow;
                } else {
                    fn = DemistoSrv.follow;
                }

                fn(event.id).then(function( /*data*/ ) {
                    self.list.update();
                }, function(response) {
                    AlertSrv.error('DemistoListCtrl', response.data, response.status);
                });
            };

            self.bulkFollow = function(follow) {
                var ids = _.pluck(self.selection, 'id');
                var fn = angular.noop;

                if (follow === true) {
                    fn = DemistoSrv.follow;
                } else {
                    fn = DemistoSrv.unfollow;
                }

                var promises = _.map(ids, function(id) {
                    return fn(id);
                });

                $q.all(promises).then(function( /*response*/ ) {
                    self.list.update();

                    AlertSrv.log('The selected events have been ' + (follow ? 'followed' : 'unfollowed'), 'success');
                }, function(response) {
                    AlertSrv.error('DemistoListCtrl', response.data, response.status);
                });
            };

            self.import = function(event) {
                $uibModal.open({
                    templateUrl: 'views/partials/demisto/event.dialog.html',
                    controller: 'DemistoEventCtrl',
                    controllerAs: 'dialog',
                    size: 'lg',
                    resolve: {
                        event: event
                    }
                });
            };

            self.bulkImport = function() {
                var modalInstance = $uibModal.open({
                    templateUrl: 'views/partials/demisto/bulk.import.dialog.html',
                    controller: 'DemistoBulkImportCtrl',
                    controllerAs: 'dialog',
                    size: 'lg',
                    resolve: {
                        events: function() {
                            return self.selection;
                        }
                    }
                });

                modalInstance.result.then(function(data) {
                    self.list.update();

                    if (data.length === 1) {
                        $state.go('app.case.details', {
                            caseId: data[0].id
                        });
                    }

                });
            };

            self.bulkIgnore = function() {
                var ids = _.pluck(self.selection, 'id');

                var promises = _.map(ids, function(id) {
                    return DemistoSrv.ignore(id);
                });

                $q.all(promises).then(function( /*response*/ ) {
                    self.list.update();
                    AlertSrv.log('The selected events have been ignored', 'success');
                }, function(response) {
                    AlertSrv.error('DemistoListCtrl', response.data, response.status);
                });
            };

            self.resetSelection = function() {
                if (self.menu.selectAll) {
                    self.selectAll();
                } else {
                    self.selection = [];
                    self.menu.selectAll = false;
                    self.updateMenu();
                }
            };

            self.ignore = function(event) {
                DemistoSrv.ignore(event.id).then(function( /*data*/ ) {
                    self.list.update();
                });
            };

            self.load = function() {
                self.list = DemistoSrv.list($scope, self.resetSelection);
            };

            self.cancel = function() {
                self.modalInstance.close();
            };

            self.updateMenu = function() {
                var temp = _.uniq(_.pluck(self.selection, 'follow'));

                self.menu.unfollow = temp.length === 1 && temp[0] === true;
                self.menu.follow = temp.length === 1 && temp[0] === false;
            };

            self.select = function(event) {
                if (event.selected) {
                    self.selection.push(event);
                } else {
                    self.selection = _.reject(self.selection, function(item) {
                        return item.id === event.id;
                    });
                }

                self.updateMenu();

            };

            self.selectAll = function() {
                var selected = self.menu.selectAll;
                _.each(self.list.values, function(item) {
                    item.selected = selected;
                });

                if (selected) {
                    self.selection = self.list.values;
                } else {
                    self.selection = [];
                }

                self.updateMenu();

            };

            self.load();
        });
})();
