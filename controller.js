angular
  .module('magnet')
  .controller('MagneticFieldCtrl', MagneticFieldCtrl);
function MagneticFieldCtrl($scope, $q, $state, $stateParams, $location, $rootScope, Checkin, UserService, $ionicModal, Attraction, PushService, $timeout, MatchService, $ionicNativeTransitions, SocketService, GlobalService, $ionicPlatform, Attraction, localStorageService, Chat, TransitionService) {
    var attractionService = new Attraction();
    var chatService = new Chat();
    GlobalService.base_state = 'app.magneticField';
    $scope.attractionList = $rootScope.attractionList;
    if (localStorageService.get('magnet_field_tutorial') !== null) {
      $scope.magnet_field_tutorial = localStorageService.get('magnet_field_tutorial') ;
    } else {
      $scope.magnet_field_tutorial = true;
    }

    localStorageService.set('magnet_field_tutorial', false);
    $scope.magnet_field_yes_tutorial = (localStorageService.get('magnet_field_yes_tutorial') !== null) ? false : true;
    $scope.magnet_field_no_tutorial = (localStorageService.get('magnet_field_no_tutorial') !== null) ? false : true;
    function disableTutorial(like) {
      if (like == true) {
        $scope.magnet_field_yes_tutorial = false;
        localStorageService.set('magnet_field_yes_tutorial', false);
      } else {
        $scope.magnet_field_no_tutorial = false;
        localStorageService.set('magnet_field_no_tutorial', false);
      }
    }
    $scope.$watch($rootScope.attractionList, function(newVal, oldVal) {
      $scope.attractionList = $rootScope.attractionList;
    }, true);
    $scope.$on('MF:refresh', function() {
      $rootScope.attractionList = [];
      $scope.attractionList = $rootScope.attractionList;
    });
    $scope.trunc = Math.trunc;
    $scope.attracted = false;
    $scope.isExpress = true;
    var checkinService = new Checkin();
    var matchService = new MatchService();
    var profileService = new UserService();
    var current_user = profileService.getUser();
    function getUsers() {
        var userInfoJson = profileService.getUser();
        var user = new Object();
        user = userInfoJson;
        $scope.user = user;
    };
    function init() {
        getUsers();
        $q.all([getAttractions(), getChats()]).then(function(data) {
          $scope.loadList();
        });
    }
    $scope.getLength = function(type) {
      if (type === 'chat') {
        return $rootScope.chats.length;
      } else if ( type === 'attraction') {
        return $rootScope.attractionList.length;
      }
      return 0;
        // return Object.keys(obj).length;
    }
    init();
    $scope.$on('venu:getUsers', function () {
        console.log("$on listen venu:getUsers");
        $state.reload();
    });
    var filterUser = function(checkin) {
        checkin.match_preferences = {
            "looking_for": checkin.looking_for,
            "gender": checkin.gender,
            "min_age": checkin.min_age,
            "max_age": checkin.max_age,
            "max_distance": checkin.max_distance
        };
        var checkin_user = checkin;
        return true;
    };
    $scope.goToPositiveField = function(){
        $ionicNativeTransitions.stateGo('app.positiveField', {}, {
          "type": "slide",
          "direction": "down", // 'left|right|up|down', default 'left' (which is like 'next')
          //"duration": 1300,
          // "androiddelay": 200, // in milliseconds (ms), default 400
        });
    }
    $scope.loadList = function(){
        var deferred = $q.defer();
        checkinService.query($rootScope.currentVenue, function(response){
            if (response.length == 0){
                $scope.checkins = [];
            }
            else {
                filtered_users = response.filter(filterUser);
                $scope.checkins = filtered_users.filter(function(checkin) { return checkinService.showInMagneticField(checkin.facebook_id) });
            }
            deferred.resolve();
        }, function(error) {
          console.log('loadList', error);
          deferred.reject();
        });
        return deferred.promise;
    };
    function getAttractions() {
      var d = $q.defer();
      var response = attractionService.query($rootScope.currentVenue, function(){
        if (response.length == 0){
            console.log('no attraction');
            $timeout(function() {
              $rootScope.attractionList = [];
            });
        }
        else {
            console.log(response.length + ' attractions');
            response.forEach(function(elem) {
              elem.notification_type = 'attraction';
              if (elem.issuer_facebook_id != current_user.facebook_id) {
                elem.other_facebook_id = elem.issuer_facebook_id;
                elem.other_avatar_url = elem.issuer_avatar_url;
                checkinService.addToAttractionList(elem.issuer_facebook_id);
              } else {
                elem.other_facebook_id = elem.matched_facebook_id;
                elem.other_avatar_url = elem.matched_avatar_url;
                checkinService.addToAttractionList(elem.matched_facebook_id);
              }
              var channel_name = (current_user.facebook_id < elem.other_facebook_id ? current_user.facebook_id + '-' + elem.other_facebook_id : elem.other_facebook_id + '-' + current_user.facebook_id);
              SocketService.emit('join', current_user.facebook_id, channel_name); // chat room id unique for the two users
              GlobalService.chat_room = channel_name;
            });
        };
        d.resolve(response);
      });
      return d.promise;
    };
    function getChats() {
      var d = $q.defer();
      var response = chatService.chats($rootScope.currentVenue, function(){
        if (response.length == 0){
            console.log('no chats');
            $rootScope.chats = {};
        }
        else {
            console.log(response.length + ' chats');
            response.forEach(function(elem) {
              elem.notification_type = 'chat';
              if (current_user.facebook_id != elem.initiator_json.facebook_id) {
                elem.other_avatar_url = elem.initiator_json.avatar_url;
                elem.other_json = elem.initiator_json;
                elem.other_facebook_id = elem.initiator_json.facebook_id;
                messages = JSON.parse(elem.messages);
                elem.chat = checkinService.initializeChat(elem.initiator_json.facebook_id, messages, elem.id);
              } else {
                elem.other_avatar_url = elem.partner_json.avatar_url;
                elem.other_json = elem.partner_json;
                elem.other_facebook_id = elem.partner_json.facebook_id;
                messages = JSON.parse(elem.messages);
                elem.chat = checkinService.initializeChat(elem.partner_json.facebook_id, messages, elem.id);
              };
              var channel_name = (current_user.facebook_id < elem.other_json.facebook_id ? current_user.facebook_id + '-' + elem.other_json.facebook_id : elem.other_json.facebook_id + '-' + current_user.facebook_id);
              SocketService.emit('join', current_user.facebook_id, channel_name); // chat room id unique for the two users
              GlobalService.chat_room = channel_name;
            });
            checkStartedChatRoom(response);
        };
        d.resolve(response);
      });
      return d.promise;
    };
    function checkStartedChatRoom(chats) {
      var userService = new UserService();
      var user_facebook_id = userService.getUser().facebook_id;
      chats.forEach(function(chat) {
        var messages = JSON.parse(chat.messages);
        if (messages.length > 0) {
          var init_chat_facebook_id = messages[0].facebook_id;
          for ( var i = 1; i < messages.length; i++ ) {
            if (init_chat_facebook_id != messages[i].facebook_id) {
              var other_facebook_id = messages[i].facebook_id;
              if (user_facebook_id != init_chat_facebook_id) {
                other_facebook_id = init_chat_facebook_id;
              }
              TransitionService.goToChat(other_facebook_id);
              return true;
            }
          }
        }
      });
      return false;
    }
    $scope.LoadListDelay = function() {
        $timeout( function() {
        //simulate async response
            $scope.loadList();
            //Stop the ion-refresher from spinning
            $scope.$broadcast('scroll.refreshComplete');
            console.log("LoadListDelay");
        }, 1000);
    };
    $scope.UserDetails = function(){
        var facebook_id = $(event.target).parents("div[class~='user-card']").attr("data-id");
        $scope.closeModal();
        $state.go('app.userGeneral', {facebook_id: facebook_id, comes_from_chat:false});
    };
    // $scope.showUserDetails = function($event) {
    //     var user_id = $(event.target).data('id');
    //     $scope.checkins.find(function (checkin) {
    //         if (checkin.user === user_id) {
    //             $state.go('app.profileQuick', {checkin: checkin});
    //         };
    //     });
    // }
    // ---------------------------QUICK PROFILE MODAL------------------------------------------
    $ionicModal.fromTemplateUrl('templates/user-quick-profile-modal.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.quickModal = modal;
    });
    $ionicModal.fromTemplateUrl('templates/user-express-discard-modal.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.expressDiscardModal = modal;
    });
    $scope.likeUser = function(){
        var user1_id = $scope.user.id;
        var user2_id = $scope.checkin.user;
        var facebook1_id = $scope.user.facebook_id;
        var facebook2_id = $scope.checkin.facebook_id;
        var channel_name = (facebook1_id < facebook2_id ? facebook1_id + '-' + facebook2_id : facebook2_id + '-' + facebook1_id);
        SocketService.emit('join', facebook1_id, channel_name); // chat room id unique for the two users
        GlobalService.chat_room = channel_name;
        var attraction_data = {
          'issuer': user1_id,
          'matched': user2_id,
          'venue': $rootScope.currentVenue
        };
        disableTutorial(true);
        $scope.closeDiscardModal();
        /* save attraction */
        var attractionService = new Attraction();
        attractionService.create(attraction_data, function() {
            $scope.closeQuickModal();
            $rootScope.matchedUser = $scope.checkin;
            if ($rootScope.matchedUser.likesme) {
                SocketService.emit('attracted', user1_id, channel_name); // chat room id unique for the two users
                /* go to the attraction page */
                // remove the user from the attractionList so the app user can access the user profile again
                checkinService.addToAttractionList($rootScope.matchedUser.facebook_id)
                $state.go("app.attraction", {"checkin": $scope.checkin});
            } else {
                checkinService.addToLikeList($rootScope.matchedUser.facebook_id)
                $scope.loadList();
                $state.go("app.magneticField");
            };
            var pushService = new PushService();
            pushService.sendPush({ user_id: user2_id, platform: ionic.Platform.platform() });
        });
    };
    $scope.openlikeUserModal = function(event) {
      $scope.isExpress = true;
      $scope.quickModal.hide();
      $scope.expressDiscardModal.show();
    }
    $scope.openDiscardModal = function(event) {
      $scope.isExpress = false;
      $scope.quickModal.hide();
      $scope.expressDiscardModal.show();
      $('#main').addClass('modal-open');
    }
    $scope.closeExpressDiscardModal = function() {
      $scope.expressDiscardModal.hide();
      $scope.quickModal.show();
    }
    $scope.closeDiscardModal = function() {
      $scope.expressDiscardModal.hide();
      $('#main').removeClass('modal-open');
    }
    $scope.openModal = function(event){
        $scope.loadList().then(function() {
            var user_id = $(event.target).data('id');
            findPredicate($scope.checkins, function (checkin) {
                if (checkin.user === user_id) {
                    var user = checkin;
                    $scope.checkin = checkin;
                    var years = window.calculateAge(user.birth_date);
                    user.years = years;
                    switch (user.gender){
                        case "female":
                            user.custom_gender = "F";
                            break;
                        case "male":
                            user.custom_gender = "M";
                            break;
                        case "other":
                            user.custom_gender = "O";
                            break;
                    }
                    var inches = user.height;
                    var feet = Math.floor(inches / 12);
                    inches %= 12;
                    user.formatted_height = feet + '\' ' + Math.floor(inches) + '"';
                    $scope.quickUser =  user;
                    if ($scope.quickUser.tagline == 'enter your tagline') $scope.quickUser.tagline = '';
                    $('#main').addClass('modal-open');
                    $scope.quickModal.show();
                }
            });
        });
    };
    $scope.closeModal = function() {
        $scope.expressDiscardModal.hide();
        $scope.quickModal.show();
    };
    $scope.closeAllModals = function() {
      $scope.expressDiscardModal.hide();
      $scope.quickModal.hide();
      $('#main').removeClass('modal-open');
    }
    $scope.closeQuickModal = function() {
      $scope.quickModal.hide();
      $('#main').removeClass('modal-open');
    }
    $scope.backToLikeUserModal = function() {
      $scope.closeExpressDiscardModal();
    }
    $scope.backtoMagneticField = function(){
        var loggedUser = profileService.getUser();
        var unmatch = {"unmatch_issuer": loggedUser.facebook_id, "unmatched": $scope.checkin.facebook_id};
        matchService.unmatch(unmatch);
        $rootScope.matchedUser = null;
        var unmatchedId = $scope.checkin.facebook_id;
        disableTutorial(false);
        checkinService.addToDislikeList(unmatchedId);
        $scope.loadList();
        $scope.closeQuickModal();
    };
    $scope.backtoMagneticFieldBlacklist = function(){
        var loggedUser = profileService.getUser();
        var unmatch = {"unmatch_issuer": loggedUser.facebook_id, "unmatched": $scope.checkin.facebook_id};
        matchService.unmatch(unmatch);
        $rootScope.matchedUser = null;
        var unmatchedId = $scope.checkin.facebook_id;
        checkinService.addToDislikeList(unmatchedId);
        $scope.closeDiscardModal();
        $scope.loadList();
    };
    $scope.$on('Attraction:connected', function() {
        console.log("MagneticFieldCtrl Attraction:connected");
        $scope.$apply(function() {
            $scope.attracted = true;
        });
    });
    $scope.$on('$destroy', function() {
        // console.log('MagneticFieldCtrl $ionicView.destroy');
    });
    $scope.$on('magnetic:attraction', function() {
        $state.go("app.attraction", {"checkin": $scope.checkin});
    });
    $ionicPlatform.registerBackButtonAction(function (e) {
      e.preventDefault();
      return false;
    }, 101); // 1 more priority than back button
}
app.directive('avatarsmoothload', function() {
  return {
    restrict: 'A',
    link: function(scope, element) {
      element.bind('load', function() {
        var elParent = $(element).parents('.avatar-smooth-load');
        elParent.addClass('avatar-loaded');
        elParent.find('ion-spinner').remove();
      });
    }
  };
});
app.directive('fontadapt', function($interpolate) {
  return {
    restrict: 'A',
    link: function(scope, element) {
      var textValue = $interpolate(element.text())(scope);
      var fontSize = (13 - textValue.length) * 0.1;
      element.css({'font-size': fontSize + 'rem'});
    }
  };
});
