app.factory('Checkin', ['$rootScope', '$resource', '$interval', 'UserService', 'BACKEND_SERVER_URL', function($rootScope, $resource, $interval, UserService, BACKEND_SERVER_URL){
  var Checkin = (function() {
    function Checkin() {
      this.service = $resource(BACKEND_SERVER_URL + '/api/v1/checkins/:id/',
        {},
        {
          'save': {method:'POST', headers:{'Authorization':'Token ' + localStorage.getItem('facebookId') + ' ' + localStorage.getItem('accessToken')}},
          'query': { method: 'GET', isArray: true, headers:{'Authorization':'Token ' + localStorage.getItem('facebookId') + ' ' + localStorage.getItem('accessToken')}}
        }
      );
    }
    Checkin.prototype.create = function(data, success) {
      new this.service(data).$save(success);
    };
    Checkin.prototype.showInMagneticField = function(facebook_id) {
      if ($rootScope.likeList.indexOf(facebook_id) != -1) {
        console.log('Checkin user ' + facebook_id + ' is in my like list, not showing her in the MF.')
        show = false;
      } else if ($rootScope.dislikeList.indexOf(facebook_id) != -1) {
        console.log('Checkin user ' + facebook_id + ' is in my dislike list, not showing her in the MF.')
        show = false
      } else if ($rootScope.attractionList.indexOf(facebook_id) != -1) {
        console.log('Checkin user ' + facebook_id + ' is in my attraction list, not showing her in the MF.')
        show = false;
      } else {
        console.log('Checkin user ' + facebook_id +  ' is not in any of my lists, showing her in the MF.')
        show = true;
      };
      return show;
    };
    Checkin.prototype.showInPositiveField = function(facebook_id) {
      if ($rootScope.attractionList.indexOf(facebook_id) != -1) {
        show = true;
      } else {
        show = false;
      };
      return show;
    };
    Checkin.prototype.removeFromDislikeList = function(facebook_id) {
      idx = $rootScope.dislikeList.indexOf(facebook_id);
      if (idx != -1) {
          $rootScope.dislikeList.splice(idx, 1);
      };
    };
    Checkin.prototype.addToAttractionList = function(facebook_id) {
      this.removeFromDislikeList(facebook_id);
      idx = $rootScope.attractionList.indexOf(facebook_id);
      if (idx === -1) {
        $rootScope.attractionList.push(facebook_id);
      };
    };
    Checkin.prototype.addToLikeList = function(facebook_id) {
      this.removeFromDislikeList(facebook_id);
      idx = $rootScope.likeList.indexOf(facebook_id);
      if (idx === -1) {
        $rootScope.likeList.push(facebook_id);
      };
    };
    Checkin.prototype.addToDislikeList = function(facebook_id) {
      this.removeFromLikeList(facebook_id);
      this.removeFromAttractionList(facebook_id);
      idx = $rootScope.dislikeList.indexOf(facebook_id);
      if (idx === -1) {
        $rootScope.dislikeList.push(facebook_id);
      };
    };
    Checkin.prototype.removeFromAttractionList = function(facebook_id) {
      idx = $rootScope.attractionList.indexOf(facebook_id);
      if (idx != -1) {
          $rootScope.attractionList.splice(idx, 1);
      };
    };
    Checkin.prototype.removeFromLikeList = function(facebook_id) {
      idx = $rootScope.likeList.indexOf(facebook_id);
      if (idx != -1) {
          $rootScope.likeList.splice(idx, 1);
      };
    };
    // CHAT RELATED FUNCTIONS
    Checkin.prototype.updateChat = function(facebook_id, messages) {
      console.log('Updating messages of chat with user ' + facebook_id + ': ' + JSON.stringify(messages));
      $rootScope.$broadcast('Attraction:connected');
      if (facebook_id in $rootScope.chats) {
        for (i in messages) {
          $rootScope.chats[facebook_id].messages.push(messages[i]);
        };
      } else {
        this.initializeChat(facebook_id, messages);
      };
      return $rootScope.chats[facebook_id].messages.length;
    };
    Checkin.prototype.setChatStatus = function(facebook_id, status) {
      if (! (facebook_id in $rootScope.chats)) {
        this.initializeChat(facebook_id, []);
      };
      $rootScope.chats[facebook_id].status = status;
      if ((status == 'started') && ($rootScope.chats[facebook_id].start_time === undefined)) {
        $rootScope.chats[facebook_id].start_time = Date.now();
      };
    };
    Checkin.prototype.setChatInterval = function(facebook_id, chatInterval) {
      if (! (facebook_id in $rootScope.chats)) {
        this.initializeChat(facebook_id, []);
      };
      $rootScope.chats[facebook_id].chatInterval = chatInterval;
    };
    Checkin.prototype.setChatTimer = function(facebook_id, timer) {
      if (! (facebook_id in $rootScope.chats)) {
        this.initializeChat(facebook_id, []);
      };
      $rootScope.chats[facebook_id].timer = timer;
    };
    Checkin.prototype.setChatStartime = function(facebook_id, start_time) {
      if (! (facebook_id in $rootScope.chats)) {
        this.initializeChat(facebook_id, []);
      };
      $rootScope.chats[facebook_id].start_time = start_time;
    };
    Checkin.prototype.setChatId = function(facebook_id, id) {
      if (! (facebook_id in $rootScope.chats)) {
        this.initializeChat(facebook_id, []);
      };
      $rootScope.chats[facebook_id].id = id;
    };
    Checkin.prototype.initializeChat = function(facebook_id, messages, id) {
      console.log('Initializing chat with user ' + facebook_id + ': ' + JSON.stringify(messages));
      if (! (facebook_id in $rootScope.chats)) {
        $rootScope.chats[facebook_id] = {'facebook_id': facebook_id, 'messages': messages, 'status': 'open', 'id': id, 'timer': 0};
      } else {
        jQuery.extend($rootScope.chats[facebook_id].messages, messages);
      };
      $rootScope.chats[facebook_id].messages = $rootScope.chats[facebook_id].messages.sort(function (a, b) {
        return a.time-b.time;
      });
      return $rootScope.chats[facebook_id];
    };
    Checkin.prototype.lastMessage = function(facebook_id) {
        chat = this.getChat(facebook_id);
        sorted_messages = chat.messages.sort(function (a, b) {
          return a.time-b.time;
        });
        return sorted_messages[0].message;
    };
    Checkin.prototype.getChat = function(facebook_id) {
      if (facebook_id in $rootScope.chats) {
        if (!angular.isDefined($rootScope.chats[facebook_id].start_time) && $rootScope.chats[facebook_id].messages.length > 0) {
          $rootScope.chats[facebook_id].start_time = getStartTime($rootScope.chats[facebook_id].messages);
        }
        return $rootScope.chats[facebook_id];
      } else {
        $rootScope.chats[facebook_id] = {'facebook_id': facebook_id, 'messages': [], 'status': 'open'};
        // $rootScope.chats[facebook_id].start_time = Date.now();
        return $rootScope.chats[facebook_id];
      };
    };
    /**
     * get start_time on which the two partied started the chat.
     */
    function getStartTime(messages) {
      var issuer_facebook_id = messages[0].facebook_id;
      for (var i = 1 ; i < messages.length; i++) {
        if (issuer_facebook_id != messages[i].facebook_id) {
          return messages[i].time;
        }
      }
    }
    Checkin.prototype.get_outgoing_count = function(facebook_id) {
      if (facebook_id in $rootScope.chats) {
        messages = $rootScope.chats[facebook_id].messages;
        counter = 0;
        for (i in messages) {
          if (messages[i].facebook_id != facebook_id) {
            counter++;
          };
        };
        return counter;
      } else {
        return 0;
      };
    };
    Checkin.prototype.get_incoming_count = function(facebook_id) {
      if (facebook_id in $rootScope.chats) {
        messages = $rootScope.chats[facebook_id].messages;
        counter = 0;
        for (i in messages) {
          if (messages[i].facebook_id === facebook_id) {
            counter++;
          };
        };
        return counter;
      } else {
        return 0;
      };
    };
    Checkin.prototype.destroyChat = function(facebook_id) {
      if (angular.isDefined($rootScope.chats[facebook_id]) && angular.isDefined($rootScope.chats[facebook_id].chatInterval)) {
        $interval.cancel($rootScope.chats[facebook_id].chatInterval);
      };
      delete $rootScope.chats[facebook_id];
    };
    // CHAT STATE
    Checkin.prototype.query = function(venue_id, success) {
      var service = new UserService();
      var userInfoJson = service.getUser();
      var user = new Object();
      user = userInfoJson;
      return this.service.query({ facebook_id: user.facebook_id, venue_id: venue_id}, function(data) {
        success(data);
      });
    };
    return Checkin;
  })();
  return Checkin;
}]);
