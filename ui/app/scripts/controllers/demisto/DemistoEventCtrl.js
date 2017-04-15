(function() {
    'use strict';
    angular.module('theHiveControllers')
        .controller('DemistoEventCtrl', function($rootScope, $state, $uibModalInstance, DemistoSrv, AlertSrv, event) {
            var self = this;
            var eventId = event.id;

            self.loading = true;

            self.pagination = {
                pageSize: 10,
                currentPage: 1,
                data: []
            };

            self.loadPage = function() {
                var end = self.pagination.currentPage * self.pagination.pageSize;
                var start = end - self.pagination.pageSize;

                var data = [];
                angular.forEach(self.event.attributes.slice(start, end), function(d) {
                    data.push(d);
                });

                self.pagination.data = data;
            };

            self.load = function() {
                DemistoSrv.get(eventId).then(function(response) {
                    self.event = response.data;
                    self.loading = false;

                    self.dataTypes = _.countBy(self.event.attributes, function(attr) {
                        return attr.dataType;
                    });

                    self.loadPage();
                }, function(response) {
                  self.loading = false;
                  AlertSrv.error('DemistoEventCtrl', response.data, response.status);
                  $uibModalInstance.dismiss();
                });
            };

            self.import = function() {
                self.loading = true;
                DemistoSrv.create(self.event.id).then(function(response) {
                    $uibModalInstance.dismiss();

                    $rootScope.$broadcast('demisto:event-imported');

                    $state.go('app.case.details', {
                        caseId: response.data.id
                    });
                }, function(response) {
                    self.loading = false;
                    AlertSrv.error('DemistoEventCtrl', response.data, response.status);
                });
            };

            self.ignore = function(){
                DemistoSrv.ignore(self.event.id).then(function( /*data*/ ) {
                    $uibModalInstance.dismiss();
                });
            };

            self.follow = function() {
                var fn = angular.noop;

                if (self.event.follow === true) {
                    fn = DemistoSrv.unfollow;
                } else {
                    fn = DemistoSrv.follow;
                }

                fn(self.event.id).then(function() {
                    self.load();
                }).catch(function(response) {
                    AlertSrv.error('DemistoEventCtrl', response.data, response.status);
                });
            };

            self.cancel = function() {
                $uibModalInstance.dismiss();
            };

            self.load();
        });
})();
