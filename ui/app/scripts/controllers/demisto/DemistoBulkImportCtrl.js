(function() {
    'use strict';
    angular.module('theHiveControllers')
        .controller('DemistoBulkImportCtrl', function($rootScope, $q, $uibModalInstance, DemistoSrv, AlertSrv, events) {
            var self = this;
            self.events = events;
            self.disableButtons = false;

            self.import = function() {
                self.disableButtons = true;

                var ids = _.pluck(self.events, 'id');

                var promises = _.map(ids, function(id) {
                    return DemistoSrv.create(id);
                });

                $q.all(promises).then(function(response) {
                    AlertSrv.log('The selected events have been imported', 'success');

                    $rootScope.$broadcast('demisto:event-imported');

                    $uibModalInstance.close(_.pluck(response, 'data'));
                }, function(response) {
                    self.disableButtons = false;
                    AlertSrv.error('DemistoBulkImportCtrl', response.data, response.status);
                });
            };

            self.cancel = function() {
                $uibModalInstance.dismiss();
            };
        });
})();
