(function() {
    'use strict';
    angular.module('theHiveServices')
        .factory('DemistoSrv', function($q, $http, $rootScope, StatSrv, StreamSrv, PSearchSrv) {

            var baseUrl = './api/connector/demisto';

            var factory = {
                list: function(scope, callback) {
                    return PSearchSrv(undefined, 'connector/demisto', {
                        scope: scope,
                        sort: '-publishDate',
                        loadAll: false,
                        pageSize: 10,
                        onUpdate: callback || angular.noop,
                        streamObjectType: 'demisto'
                    });
                },

                get: function(demistoId) {
                    return $http.get(baseUrl + '/get/' + demistoId);
                },

                create: function(demistoId) {
                    return $http.post(baseUrl + '/case/' + demistoId, {});
                },

                ignore: function(demistoId) {
                    return $http.get(baseUrl + '/ignore/' + demsitoId);
                },

                follow: function(demistoId) {
                    return $http.get(baseUrl + '/follow/' + demistoId);
                },

                unfollow: function(demistoId) {
                    return $http.get(baseUrl + '/unfollow/' + demistoId);
                },

                onSuccess: function() {
                    $rootScope.$broadcast('demsito:status-updated', true);
                },

                onFailure: function() {
                    $rootScope.$broadcast('demisto:status-updated', false);
                },

                stats: function(scope) {
                    var field = 'eventStatus',
                        demistoStatQuery = {
                            _not: {
                                _in: {
                                    _field: 'eventStatus',
                                    _values: ['Ignore', 'Imported']
                                }
                            }
                        },
                        result = {},
                        statConfig = {
                            query: demistoStatQuery,
                            objectType: 'connector/demisto',
                            field: field,
                            result: result,
                            success: factory.onSuccess,
                            error: factory.onFailure
                        };



                    StreamSrv.addListener({
                        rootId: 'any',
                        objectType: 'demisto',
                        scope: scope,
                        callback: function() {
                            StatSrv.get(statConfig);
                        }
                    });

                    return StatSrv.get(statConfig);
                }
            };

            return factory;
        });

})();
