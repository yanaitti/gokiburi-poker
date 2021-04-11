var timeout = 1000;
var timer = '';

$(function() {
  var gId = '';
  var cId = '';
  $('#entry').show();

  $('#clickCopy').click(function(){
    var text = $('#uriWgId').val();
    var clipboard = $('<textarea></textarea>');
    clipboard.text(text);
    $('body').append(clipboard);
    clipboard.select();
    document.execCommand('copy');
    clipboard.remove();
  });

  // Create Game
  $('#createGame').click(function() {
    $('#message').empty();
    $.ajax('/create' + '/' + $('#cName_inp').val(),
      {
        type: 'get',
      }
    )
    .done(function(data) {
      $('#gId').text(data);
      $('#cId').text(data);
      $('#cName').text($('#cName_inp').val());
      $('#gStatus').text('waiting');
      $('#uriWgId').val(location.href + data + '/join');
      gId = data;
      cId = data;
      $('#sec1').show();
      timer = setTimeout(status_check(gId, cId), timeout);
    })
    .fail(function() {
      $('#message').text('エラーが発生しました');
    });
  });

  // Join Game
  $('#joinGame').click(function() {
    $('#message').empty();
    $.ajax('/' + $('#gId_inp').val() + '/join/' + $('#cName_inp').val(),
      {
        type: 'get',
      }
    )
    .done(function(data) {
      _tmp = data.split(' ,');
      $('#cId').text(_tmp[0]);
      $('#cName').text(_tmp[1]);
      $('#gStatus').text(_tmp[2]);
      gId = $('#gId_inp').val();
      cId = _tmp[0];
      timer = setTimeout(status_check(gId, cId), timeout)
    })
    .fail(function() {
      $('#message').text('エラーが発生しました');
    });
  });

  // Start Game
  $('#startGame').click(function() {
    $('#message').empty();
    $.ajax('/' + gId + '/start',
      {
        type: 'get',
      }
    )
    .done(function(data) {
      $('#sec5').css('display', 'none');
      $('#sec6').css('display', 'none');
    })
    .fail(function() {
      $('#message').text('エラーが発生しました');
    });
  });

  // send the card
  $('#send').click(function() {
    $('#message').empty();
    $.ajax('/' + gId + '/' + cId + '/send/' + $('#candidatelists').val() + '/' + $('#typelists').val() + '/' + $('input[name="selcard"]:checked').val(),
      {
        type: 'get',
      }
    )
    .done(function(data) {
      $('#sec3').css('display', 'none');
      $('#sec4').css('display', 'none');
      $('#sec5').css('display', 'none');
      $('#sec6').css('display', 'none');
      $('#confirm').prop("disabled", false);
    })
    .fail(function() {
      $('#message').text('エラーが発生しました');
    });
  });

  // send the card
  $('#send2').click(function() {
    $('#message').empty();
    $.ajax('/' + gId + '/' + cId + '/send/' + $('#candidatelists').val() + '/' + $('#typelists').val(),
      {
        type: 'get',
      }
    )
    .done(function(data) {
      $('#sec3').css('display', 'none');
      $('#sec4').css('display', 'none');
      $('#sec5').css('display', 'none');
      $('#sec6').css('display', 'none');
      $('#confirm').prop("disabled", false);
    })
    .fail(function() {
      $('#message').text('エラーが発生しました');
    });
  });

  // confirm
  $('#confirm').click(function() {
    $('#correct').prop("disabled", true);
    $('#wrong').prop("disabled", true);
    $('#confirm').prop("disabled", true);
    $('#sec6').show();
  });

  // answer
  $('#correct').click(function() {
    $('#message').empty();
    $.ajax('/' + gId + '/' + cId + '/judge/0',
      {
        type: 'get',
      }
    )
    .done(function(data) {
      $('#sec3').css('display', 'none');
      $('#sec4').css('display', 'none');
      $('#sec5').css('display', 'none');
      $('#sec6').css('display', 'none');
      $('#confirm').prop("disabled", false);
    })
    .fail(function() {
      $('#message').text('エラーが発生しました');
    });
  });

  $('#wrong').click(function() {
    $('#message').empty();
    $.ajax('/' + gId + '/' + cId + '/judge/1',
      {
        type: 'get',
      }
    )
    .done(function(data) {
      $('#sec3').css('display', 'none');
      $('#sec4').css('display', 'none');
      $('#sec5').css('display', 'none');
      $('#sec6').css('display', 'none');
      $('#confirm').prop("disabled", false);
    })
    .fail(function() {
      $('#message').text('エラーが発生しました');
    });
  });


});

var status_check = function(gId, cId){
  setTimeout(function(){
    $('#message').empty();
    // all status
    $.getJSON('/' + gId + '/status',
      {
        type: 'get',
      }
    )
    .done(function(data) {
      console.log(data)
      $('#gStatus').text(data.status);
      playerPos = 0;
      // Applying List
      $('#applyingList').empty();
      for(var pIdx in data.players){
        // console.log(data.players[pIdx])
        $('#applyingList').append(data.players[pIdx].nickname + '(' + data.players[pIdx].playerid + ')' + ',');
        if(cId == data.players[pIdx].playerid){
          playerPos = pIdx;
        }
      }

      if (data.players[playerPos].holdcards.length != $('#holdcards li').length){
        // console.log('different');
        $('#holdcards').empty();
        for(var sIdx in data.players[playerPos].holdcards){
          cardname = cardtype[data.players[playerPos].holdcards[sIdx] % 8];
          $('#holdcards').append('<li class="card' + data.players[playerPos].holdcards[sIdx] % 8 + '"><input type="radio" name="selcard" id="selcard[]" value="'+data.players[playerPos].holdcards[sIdx]+'">'+cardname+'</li>');
        }
      }

      switch(data.status){
        case 'waiting':
          break;
        case 'started':
          $('#entry').hide();
          if(data.candidatelists.length != $('#candidatelists').children('option').length){
            $('#candidatelists').children().remove();
            for(var pIdx in data.candidatelists){
              if(data.candidatelists[pIdx].playerid != cId){
                $('#candidatelists').append('<option value="'+data.candidatelists[pIdx].playerid+'">'+data.candidatelists[pIdx].nickname+'</option>');
              }
            }
          }
          $('#routed_cards').empty();
          $('#confirmedcard').empty();
          $('#sec5').css('display', 'none');
          $('#confirm').prop("disabled", false);
          $('#send').prop("disabled", false);
          $('#send2').prop("disabled", false);
          $('#correct').prop("disabled", false);
          $('#wrong').prop("disabled", false);

          $('#playerinformation').empty();
          for(var pIdx in data.players){
            $('#playerinformation').append(data.players[pIdx].nickname + ':<br/>');
            _stacks = Array(8);
            _stacks.fill('');
            for(var sIdx in data.players[pIdx].stacks){
              _stacks[(data.players[pIdx].stacks[sIdx] % 8)] += '*';
            }
            var rowul = $('<ul class="nav"></ul>').appendTo($('#playerinformation'));
            for(var cIdx in cardtype){
              $('<li class="card' + cIdx + '">' + cardtype[cIdx] + ':' + _stacks[cIdx] + '</li>').appendTo(rowul);
            }
          }

          $('#sec2').show();

          if(data.routeid == cId){
            $('#sec3').show();
            $('#sec4').show();
          }
          break;
        case 'sending':
          if(data.candidatelists.length != $('#candidatelists').children('option').length){
            $('#candidatelists').children().remove();
            for(var pIdx in data.candidatelists){
              if(data.candidatelists[pIdx].playerid != cId){
                $('#candidatelists').append('<option value="'+data.candidatelists[pIdx].playerid+'">'+data.candidatelists[pIdx].nickname+'</option>');
              }
            }
          }
          if(data.routeid == cId){
            $('#sec5').show();
            if(data.candidatelists.length == 0){
              $('#confirm').prop("disabled", true);
              $('#send').prop("disabled", true);
              $('#send2').prop("disabled", true);
              $('#sec3').hide();
            }else{
              $('#sec3').show();
            }
          }

          for(var pIdx in data.players){
            if(data.players[pIdx].playerid == data.sending.lists.slice(-1)[0].from){
              $('#fromName').text(data.players[pIdx].nickname);
            }
          }

          var routed_cards = [];
          for(var lIdx in data.sending.lists){
            routed_cards.push(cardtype[data.sending.lists[lIdx].typeid % 8]);
          }
          $('#routed_cards').text(routed_cards.join('->'));

          $('#fromType').text(cardtype[data.sending.lists.slice(-1)[0].typeid]);
          $('#confirmedcard').text(cardtype[data.sending.cardnum % 8]);
          break;
        case 'end':
          break;

      }
    })
    .fail(function() {
      $('#message').text('エラーが発生しました');
    });
    timer = setTimeout(status_check(gId, cId), timeout)
  }, timeout);
}
